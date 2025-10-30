"""
Mesh OS Partner SDK - Python

Provides programmatic access to partner portal functionality
"""

import requests
import hashlib
import hmac
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta


class MeshOSPartnerSDK:
    """Partner SDK for Mesh OS platform"""
    
    def __init__(self, api_key: str, partner_id: str, base_url: str = "https://partner-api.meshos.io"):
        """
        Initialize the Partner SDK
        
        Args:
            api_key: Partner API key
            partner_id: Partner identifier
            base_url: API base URL (optional)
        """
        self.api_key = api_key
        self.partner_id = partner_id
        self.base_url = base_url
        self.version = "v1"
        self.timeout = 30
        
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-Partner-ID": self.partner_id,
            "Content-Type": "application/json",
            "User-Agent": "MeshOS-Partner-SDK-Python/1.0.0"
        }
    
    def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make API request
        
        Args:
            method: HTTP method
            path: API path
            data: Request payload
            
        Returns:
            Response data
        """
        url = f"{self.base_url}/{self.version}{path}"
        headers = self._get_headers()
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
    
    def deploy_tenant(self, name: str, region: str = "us-east-1", 
                     plan: str = "professional", domain: Optional[str] = None,
                     branding: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Deploy a new tenant instance
        
        Args:
            name: Tenant name
            region: Deployment region
            plan: Subscription plan
            domain: Custom domain (optional)
            branding: Branding configuration (optional)
            
        Returns:
            Tenant information
        """
        return self._request("POST", "/tenants", {
            "name": name,
            "region": region,
            "plan": plan,
            "domain": domain,
            "branding": branding or {},
            "partnerId": self.partner_id
        })
    
    def get_tenant(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant details"""
        return self._request("GET", f"/tenants/{tenant_id}")
    
    def list_tenants(self, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        List all partner tenants
        
        Args:
            filters: Optional filters (region, plan, status, etc.)
            
        Returns:
            List of tenants
        """
        query = "?" + "&".join(f"{k}={v}" for k, v in (filters or {}).items())
        return self._request("GET", f"/tenants{query}")
    
    def update_tenant(self, tenant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update tenant configuration"""
        return self._request("PATCH", f"/tenants/{tenant_id}", updates)
    
    def suspend_tenant(self, tenant_id: str, reason: str) -> Dict[str, Any]:
        """Suspend tenant"""
        return self._request("POST", f"/tenants/{tenant_id}/suspend", {"reason": reason})
    
    def resume_tenant(self, tenant_id: str) -> Dict[str, Any]:
        """Resume suspended tenant"""
        return self._request("POST", f"/tenants/{tenant_id}/resume")
    
    def delete_tenant(self, tenant_id: str) -> Dict[str, Any]:
        """Delete tenant"""
        return self._request("DELETE", f"/tenants/{tenant_id}")
    
    def issue_license(self, tenant_id: str, license_type: str = "professional",
                     duration: int = 365, features: Optional[List[str]] = None,
                     max_users: Optional[int] = None, 
                     max_agents: Optional[int] = None) -> Dict[str, Any]:
        """
        Issue license for tenant
        
        Args:
            tenant_id: Tenant identifier
            license_type: License type (starter, professional, enterprise)
            duration: Duration in days
            features: List of enabled features
            max_users: Maximum number of users
            max_agents: Maximum number of agents
            
        Returns:
            License information
        """
        return self._request("POST", "/licenses", {
            "tenantId": tenant_id,
            "type": license_type,
            "duration": duration,
            "features": features,
            "maxUsers": max_users,
            "maxAgents": max_agents
        })
    
    def revoke_license(self, license_key: str) -> Dict[str, Any]:
        """Revoke license"""
        return self._request("DELETE", f"/licenses/{license_key}")
    
    def update_branding(self, tenant_id: str, branding: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update tenant branding
        
        Args:
            tenant_id: Tenant identifier
            branding: Branding configuration (colors, logo, etc.)
            
        Returns:
            Updated branding configuration
        """
        return self._request("PUT", f"/tenants/{tenant_id}/branding", branding)
    
    def get_metrics(self, period: str = "current_month") -> Dict[str, Any]:
        """
        Get partner metrics
        
        Args:
            period: Time period (current_month, last_month, current_year, etc.)
            
        Returns:
            Partner metrics (revenue, tenants, growth, etc.)
        """
        return self._request("GET", f"/metrics?period={period}")
    
    def get_tenant_usage(self, tenant_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Get tenant usage statistics
        
        Args:
            tenant_id: Tenant identifier
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            
        Returns:
            Usage statistics
        """
        return self._request("GET", f"/tenants/{tenant_id}/usage", {
            "startDate": start_date,
            "endDate": end_date
        })
    
    def get_billing(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant billing information"""
        return self._request("GET", f"/tenants/{tenant_id}/billing")
    
    def generate_invoice(self, tenant_id: str, period: str) -> Dict[str, Any]:
        """Generate invoice for tenant"""
        return self._request("POST", f"/tenants/{tenant_id}/invoices", {"period": period})
    
    def list_webhooks(self) -> List[Dict[str, Any]]:
        """List all webhooks"""
        return self._request("GET", "/webhooks")
    
    def create_webhook(self, url: str, events: List[str], 
                      secret: Optional[str] = None) -> Dict[str, Any]:
        """
        Create webhook
        
        Args:
            url: Webhook URL
            events: List of events to subscribe to
            secret: Webhook secret for signature verification
            
        Returns:
            Webhook configuration
        """
        return self._request("POST", "/webhooks", {
            "url": url,
            "events": events,
            "secret": secret
        })
    
    def delete_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """Delete webhook"""
        return self._request("DELETE", f"/webhooks/{webhook_id}")
    
    def verify_webhook_signature(self, payload: str, signature: str, secret: str) -> bool:
        """
        Verify webhook signature
        
        Args:
            payload: Webhook payload
            signature: Received signature
            secret: Webhook secret
            
        Returns:
            True if signature is valid
        """
        expected_signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    def get_regions(self) -> List[Dict[str, Any]]:
        """Get available regions"""
        return self._request("GET", "/regions")
    
    def get_plans(self) -> List[Dict[str, Any]]:
        """Get available subscription plans"""
        return self._request("GET", "/plans")


# Example usage
def example():
    """Example SDK usage"""
    sdk = MeshOSPartnerSDK("your-api-key", "your-partner-id")
    
    try:
        # Deploy new tenant
        tenant = sdk.deploy_tenant(
            name="Acme Corp",
            region="us-east-1",
            plan="enterprise",
            branding={
                "primaryColor": "#FF6B6B",
                "companyName": "Acme Corporation"
            }
        )
        print(f"Tenant deployed: {tenant['id']}")
        
        # Issue license
        license = sdk.issue_license(
            tenant_id=tenant['id'],
            license_type="enterprise",
            duration=365,
            features=["multi-region", "sso", "advanced-analytics"]
        )
        print(f"License issued: {license['key']}")
        
        # Get metrics
        metrics = sdk.get_metrics()
        print(f"MRR: ${metrics['revenue']['mrr']}")
        
        # List tenants
        tenants = sdk.list_tenants({"status": "active"})
        print(f"Active tenants: {len(tenants)}")
        
    except Exception as e:
        print(f"SDK Error: {str(e)}")


if __name__ == "__main__":
    example()
