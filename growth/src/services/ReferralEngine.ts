import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import logger from '../utils/logger';
import { ReferralCredit } from '../types';

export class ReferralEngine {
  private supabase: any;
  private stripe: Stripe;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.stripe = new Stripe(config.external.stripeSecretKey || '', {
      apiVersion: '2023-10-16'
    });
  }

  // Generate referral code for user
  async generateReferralCode(tenantId: string, referrerUserId: string): Promise<string> {
    try {
      const referralCode = this.generateUniqueCode();
      
      const referralCredit: ReferralCredit = {
        tenantId,
        referrerUserId,
        referralCode,
        creditAmount: 0, // Will be awarded when referral is successful
        creditType: 'usage',
        status: 'pending',
        metadata: {
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        },
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };

      await this.supabase
        .from('referral_credits')
        .insert(referralCredit);

      logger.info('Referral code generated', { tenantId, referrerUserId, referralCode });
      return referralCode;
    } catch (error) {
      logger.error('Error generating referral code:', error);
      throw error;
    }
  }

  // Process referral when new user signs up
  async processReferral(tenantId: string, referralCode: string, referredUserId: string): Promise<{
    success: boolean;
    creditAmount: number;
    message: string;
  }> {
    try {
      // Find the referral credit
      const { data: referralCredit, error } = await this.supabase
        .from('referral_credits')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .single();

      if (error || !referralCredit) {
        return {
          success: false,
          creditAmount: 0,
          message: 'Invalid or expired referral code'
        };
      }

      // Check if referral code has expired
      if (new Date() > new Date(referralCredit.expires_at)) {
        await this.supabase
          .from('referral_credits')
          .update({ status: 'expired' })
          .eq('id', referralCredit.id);

        return {
          success: false,
          creditAmount: 0,
          message: 'Referral code has expired'
        };
      }

      // Calculate credit amounts
      const referrerCredit = this.calculateReferrerCredit();
      const referredCredit = this.calculateReferredCredit();

      // Award credits to referrer
      await this.supabase
        .from('referral_credits')
        .update({
          referred_user_id: referredUserId,
          credit_amount: referrerCredit,
          status: 'awarded',
          updated_at: new Date().toISOString()
        })
        .eq('id', referralCredit.id);

      // Create credit for referred user
      const referredUserCredit: ReferralCredit = {
        tenantId,
        referrerUserId: referredUserId,
        referredUserId,
        referralCode: `${referralCode}-referred`,
        creditAmount: referredCredit,
        creditType: 'usage',
        status: 'awarded',
        metadata: {
          originalReferralCode: referralCode,
          awardedAt: new Date().toISOString()
        }
      };

      await this.supabase
        .from('referral_credits')
        .insert(referredUserCredit);

      // Sync with Stripe if customer exists
      await this.syncWithStripe(tenantId, referrerCredit, referredCredit);

      logger.info('Referral processed successfully', {
        tenantId,
        referralCode,
        referrerUserId: referralCredit.referrer_user_id,
        referredUserId,
        referrerCredit,
        referredCredit
      });

      return {
        success: true,
        creditAmount: referrerCredit + referredCredit,
        message: `Referral successful! You earned $${referrerCredit} and the new user earned $${referredCredit} in credits.`
      };
    } catch (error) {
      logger.error('Error processing referral:', error);
      throw error;
    }
  }

  // Get referral statistics for user
  async getReferralStats(tenantId: string, userId: string): Promise<{
    totalReferrals: number;
    successfulReferrals: number;
    totalCreditsEarned: number;
    pendingCredits: number;
    referralCode: string;
  }> {
    try {
      // Get user's referral code
      const { data: userReferralCode } = await this.supabase
        .from('referral_credits')
        .select('referral_code')
        .eq('tenant_id', tenantId)
        .eq('referrer_user_id', userId)
        .eq('status', 'pending')
        .single();

      // Get referral statistics
      const { data: referrals } = await this.supabase
        .from('referral_credits')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('referrer_user_id', userId);

      const totalReferrals = referrals?.length || 0;
      const successfulReferrals = referrals?.filter(r => r.status === 'awarded').length || 0;
      const totalCreditsEarned = referrals
        ?.filter(r => r.status === 'awarded')
        .reduce((sum, r) => sum + r.credit_amount, 0) || 0;
      const pendingCredits = referrals
        ?.filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.credit_amount, 0) || 0;

      return {
        totalReferrals,
        successfulReferrals,
        totalCreditsEarned,
        pendingCredits,
        referralCode: userReferralCode?.referral_code || ''
      };
    } catch (error) {
      logger.error('Error getting referral stats:', error);
      throw error;
    }
  }

  // Get top referrers for tenant
  async getTopReferrers(tenantId: string, limit: number = 10): Promise<Array<{
    userId: string;
    totalReferrals: number;
    totalCreditsEarned: number;
    successRate: number;
  }>> {
    try {
      const { data: referrals } = await this.supabase
        .from('referral_credits')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'awarded');

      if (!referrals) return [];

      // Group by referrer
      const referrerStats = new Map<string, {
        userId: string;
        totalReferrals: number;
        totalCreditsEarned: number;
        successfulReferrals: number;
      }>();

      referrals.forEach(referral => {
        const userId = referral.referrer_user_id;
        if (!referrerStats.has(userId)) {
          referrerStats.set(userId, {
            userId,
            totalReferrals: 0,
            totalCreditsEarned: 0,
            successfulReferrals: 0
          });
        }

        const stats = referrerStats.get(userId)!;
        stats.totalReferrals++;
        stats.totalCreditsEarned += referral.credit_amount;
        stats.successfulReferrals++;
      });

      // Convert to array and calculate success rate
      const topReferrers = Array.from(referrerStats.values())
        .map(stats => ({
          ...stats,
          successRate: stats.successfulReferrals / stats.totalReferrals
        }))
        .sort((a, b) => b.totalCreditsEarned - a.totalCreditsEarned)
        .slice(0, limit);

      return topReferrers;
    } catch (error) {
      logger.error('Error getting top referrers:', error);
      throw error;
    }
  }

  // Sync credits with Stripe billing
  private async syncWithStripe(tenantId: string, referrerCredit: number, referredCredit: number): Promise<void> {
    try {
      if (!config.external.stripeSecretKey) {
        logger.warn('Stripe not configured, skipping sync');
        return;
      }

      // This would integrate with Stripe to apply credits to customer accounts
      // Implementation depends on your Stripe setup
      logger.info('Stripe sync not implemented yet', { referrerCredit, referredCredit });
    } catch (error) {
      logger.error('Error syncing with Stripe:', error);
    }
  }

  // Calculate referrer credit amount
  private calculateReferrerCredit(): number {
    // Base credit amount for referrer
    return 25.00;
  }

  // Calculate referred user credit amount
  private calculateReferredCredit(): number {
    // Base credit amount for referred user
    return 15.00;
  }

  // Generate unique referral code
  private generateUniqueCode(): string {
    const prefix = 'AGM'; // AgentMesh prefix
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${randomPart}`;
  }

  // Validate referral code
  async validateReferralCode(tenantId: string, referralCode: string): Promise<{
    valid: boolean;
    message: string;
  }> {
    try {
      const { data: referralCredit } = await this.supabase
        .from('referral_credits')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .single();

      if (!referralCredit) {
        return {
          valid: false,
          message: 'Invalid referral code'
        };
      }

      if (new Date() > new Date(referralCredit.expires_at)) {
        return {
          valid: false,
          message: 'Referral code has expired'
        };
      }

      return {
        valid: true,
        message: 'Valid referral code'
      };
    } catch (error) {
      logger.error('Error validating referral code:', error);
      return {
        valid: false,
        message: 'Error validating referral code'
      };
    }
  }

  // Clean up expired referral codes
  async cleanupExpiredReferrals(): Promise<number> {
    try {
      const { data: expiredReferrals } = await this.supabase
        .from('referral_credits')
        .select('id')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      if (!expiredReferrals || expiredReferrals.length === 0) {
        return 0;
      }

      const { error } = await this.supabase
        .from('referral_credits')
        .update({ status: 'expired' })
        .in('id', expiredReferrals.map(r => r.id));

      if (error) {
        logger.error('Error cleaning up expired referrals:', error);
        return 0;
      }

      logger.info('Expired referrals cleaned up', { count: expiredReferrals.length });
      return expiredReferrals.length;
    } catch (error) {
      logger.error('Error cleaning up expired referrals:', error);
      return 0;
    }
  }
}

export default ReferralEngine;
