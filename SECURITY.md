# Security Configuration Guide

This document outlines the security measures implemented in the Little Cafe application and provides guidance for secure deployment.

## Environment Variables Security

### Critical Security Variables
- `SUPABASE_SECRET_KEY` - **NEVER expose in client-side code** (replaces legacy service role key)
- `SQUARE_ACCESS_TOKEN` - **Production tokens must be kept secure**
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - Used for webhook verification

### Environment Configuration

#### Development (.env.local)
```bash
# Supabase Configuration (New Key System)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-key

# Square Sandbox Configuration
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=sandbox-sq0idb-your-app-id
SQUARE_ACCESS_TOKEN=sandbox-sq0atb-your-access-token
SQUARE_LOCATION_ID=your-sandbox-location-id
```

#### Production
- Use platform-specific environment variable configuration
- Never commit production secrets to version control
- Rotate tokens regularly (quarterly recommended)
- Use different tokens for staging and production

## API Security Measures

### Rate Limiting
Implemented rate limiting on all API endpoints:
- **Authentication**: 5 requests per 15 minutes
- **Payment Processing**: 3 requests per minute
- **General API**: 60 requests per minute
- **Admin API**: 30 requests per minute

### Input Validation
All user inputs are validated and sanitized:
- Email format validation
- Phone number format validation
- Monetary amount validation (positive, max 2 decimals)
- String sanitization to prevent XSS

### Security Headers
All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Content Security Policy (CSP)
- Strict Transport Security (HTTPS enforcement)

### Authentication & Authorization
- JWT-based authentication via Supabase
- Role-based access control (admin/user)
- Row-level security (RLS) enabled on database tables
- Admin middleware protection on sensitive endpoints

## Database Security

### Row-Level Security (RLS)
Enabled on all tables with appropriate policies:
- Users can only access their own orders
- Admin users have full access
- Anonymous users have limited read access to public data

### Query Protection
- Parameterized queries to prevent SQL injection
- Input validation before database operations
- Database connection pooling and timeout controls

## Content Security Policy

Configured CSP to prevent XSS attacks while allowing necessary resources:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.squarecdn.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://connect.squareup.com;
```

## Security Monitoring

### Logging
- Failed authentication attempts
- Rate limit violations
- Payment processing errors
- Database query failures

### Error Handling
- Sanitized error messages in production
- Detailed logging for debugging
- No sensitive data in client-side errors

## Deployment Security Checklist

### Pre-Deployment
- [ ] All environment variables properly configured
- [ ] Production tokens rotated and secured
- [ ] HTTPS enforced on all routes
- [ ] CSP headers configured correctly
- [ ] Rate limiting tested and configured

### Post-Deployment
- [ ] Security headers verified
- [ ] SSL certificate valid
- [ ] Database RLS policies active
- [ ] Error handling working correctly
- [ ] Rate limiting functioning

### Ongoing Maintenance
- [ ] Monthly token rotation
- [ ] Quarterly security audit
- [ ] Monitor security logs
- [ ] Keep dependencies updated
- [ ] Review access permissions

## Incident Response

### Security Breach Protocol
1. Immediately rotate all API tokens
2. Review access logs for suspicious activity
3. Check database for unauthorized changes
4. Notify users if data potentially compromised
5. Document incident and implement fixes

### Contact Information
- Development Team: [contact info]
- Security Team: [contact info]
- Emergency Response: [contact info]

## Security Best Practices

### For Developers
- Never commit secrets to version control
- Use different credentials for each environment
- Validate all inputs on both client and server
- Follow principle of least privilege
- Regular security training

### For Administrators
- Enable 2FA on all admin accounts
- Regular access review and cleanup
- Monitor security logs daily
- Keep backup and recovery procedures updated
- Test security measures regularly

## Compliance

### Data Protection
- PCI DSS compliance for payment processing
- GDPR compliance for data handling
- Data encryption in transit and at rest
- Secure data deletion procedures

### Audit Trail
- All admin actions logged
- Payment transactions auditable
- User access tracked
- Database changes recorded

## Emergency Contacts

In case of security incident:
- Primary: [email/phone]
- Secondary: [email/phone]
- Escalation: [email/phone]

---

**Last Updated**: [Current Date]  
**Review Schedule**: Monthly  
**Next Review**: [Next Month]