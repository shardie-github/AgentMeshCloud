# Support

Thank you for using ORCA Core! This document provides resources for getting help and support.

## 📚 Documentation

Before seeking support, please check our documentation:

- **[README.md](./README.md)** - Quick start and overview
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contributing guidelines
- **[docs/](./docs/)** - Detailed documentation
  - [Architecture Overview](./docs/ARCHITECTURE_OVERVIEW.md)
  - [Developer Guide](./docs/DEVELOPER_GUIDE.md)
  - [API Reference](./docs/API_REFERENCE.md)
  - [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

## 🐛 Bug Reports

If you've found a bug, please:

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details
   - Logs and error messages
   - Screenshots (if applicable)

[Report a Bug →](https://github.com/orca-mesh/orca-core/issues/new?template=bug_report.yml)

## 💡 Feature Requests

Have an idea for a new feature or enhancement?

1. **Search existing feature requests** to see if it's already proposed
2. **Use the feature request template** when creating a new request
3. **Explain the use case** and benefits
4. **Consider contributing** the feature yourself!

[Request a Feature →](https://github.com/orca-mesh/orca-core/issues/new?template=feature_request.yml)

## ❓ Questions and Discussions

For general questions, discussions, and community support:

- **[GitHub Discussions](https://github.com/orca-mesh/orca-core/discussions)** - Best for:
  - General questions
  - Usage help
  - Best practices
  - Architectural discussions
  - Show and tell
  
- **Community Slack** (if applicable) - Real-time chat with the community
- **Stack Overflow** - Tag questions with `orca-core` or `agent-mesh`

## 🔒 Security Issues

**DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via:

- **Email:** security@orca-mesh.io
- **See:** [SECURITY.md](./SECURITY.md) for full details

We take security seriously and will respond promptly to valid reports.

## 📞 Commercial Support

### Community Support (Free)

- GitHub Issues for bugs and features
- GitHub Discussions for questions
- Community Slack for real-time chat

**Response Time:** Best effort by community volunteers

### Enterprise Support (Paid)

For organizations requiring:

- SLA-backed response times
- Priority bug fixes
- Custom feature development
- Architecture consulting
- Training and onboarding
- Dedicated support channels

**Contact:** enterprise@orca-mesh.io

## 🔧 Self-Help Resources

### Common Issues

#### Installation Problems

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Run doctor script
pnpm run doctor
```

#### Database Connection Issues

```bash
# Check Supabase connection
pnpm run supabase:status

# Verify environment variables
cat .env | grep SUPABASE
```

#### Build Errors

```bash
# Clean build
pnpm run clean

# Type check
pnpm run typecheck

# Rebuild
pnpm run build
```

### Diagnostic Tools

```bash
# Run health check
pnpm run health:check

# Check dependencies
pnpm audit

# Verify configuration
pnpm run doctor
```

### Logs and Debugging

Enable debug logging:

```bash
export DEBUG=orca:*
export LOG_LEVEL=debug
pnpm run dev
```

## 📖 Additional Resources

### Learning Resources

- **[Getting Started Guide](./docs/GETTING_STARTED.md)**
- **[API Documentation](./docs/API_REFERENCE.md)**
- **[Video Tutorials](https://youtube.com/@orca-mesh)** (if available)
- **[Blog Posts](https://blog.orca-mesh.io)** (if available)

### Community

- **GitHub Discussions:** Share ideas and get help
- **Twitter/X:** [@orca_mesh](https://twitter.com/orca_mesh) (if applicable)
- **LinkedIn:** Follow for updates
- **Newsletter:** Subscribe for monthly updates

### Contributing

Want to help improve ORCA Core?

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[Good First Issues](https://github.com/orca-mesh/orca-core/labels/good-first-issue)** - Great for newcomers
- **[Help Wanted](https://github.com/orca-mesh/orca-core/labels/help-wanted)** - Issues needing assistance

## 📝 Feedback

We value your feedback! Help us improve by:

- ⭐ **Starring the repository** if you find it useful
- 📣 **Sharing** ORCA Core with others
- 💬 **Participating** in discussions
- 🐛 **Reporting bugs** you encounter
- 💡 **Suggesting features** you'd like to see
- 🤝 **Contributing** code or documentation

## ⏱️ Response Times

### Community Support

- **GitHub Issues:** 2-7 business days (best effort)
- **GitHub Discussions:** 1-5 business days (best effort)
- **Pull Requests:** 3-10 business days (best effort)

### Security Issues

- **Initial Response:** Within 48 hours
- **Triage:** Within 7 days
- **Critical Issues:** Prioritized

### Enterprise Support

- **Critical:** 4 hours
- **High:** 8 business hours
- **Medium:** 2 business days
- **Low:** 5 business days

## 📅 Office Hours

Community office hours (if available):

- **When:** First Thursday of each month, 15:00-16:00 UTC
- **Where:** Zoom/Google Meet (link in Discussions)
- **What:** Q&A, demos, roadmap discussions

## 🌍 Community Guidelines

When seeking support:

- ✅ Be respectful and professional
- ✅ Provide complete information
- ✅ Search before asking
- ✅ Follow up when your issue is resolved
- ✅ Help others when you can
- ❌ Don't hijack threads
- ❌ Don't spam or cross-post
- ❌ Don't share sensitive information publicly

## 📜 Support Policy

### Supported Versions

We provide support for:

- **Current major version:** Full support
- **Previous major version:** Security fixes only
- **Older versions:** Community support only

See [CHANGELOG.md](./CHANGELOG.md) for version history.

### End of Life

Versions reach end-of-life 12 months after the next major version release.

## 🙏 Acknowledgments

Thank you to all our contributors, users, and community members who help make ORCA Core better!

---

**Need help? Don't hesitate to reach out. We're here to help! 🚀**
