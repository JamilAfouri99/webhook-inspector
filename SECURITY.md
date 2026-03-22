# Security Policy

We take the security of this project seriously. If you believe you have found a security vulnerability, please follow the responsible disclosure process outlined below.

## Reporting a Vulnerability

**Do NOT report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please use [GitHub's Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) feature to submit your report. This ensures that sensitive details remain confidential until a fix is available.

When reporting, please include as much of the following as possible:

- A description of the vulnerability and its potential impact
- Step-by-step instructions to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code
- The version(s) affected, if known

## Response Timeline

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours.
- **Detailed response:** We will provide a detailed response within 7 days, including an assessment of the issue and an expected timeline for a fix.
- **Fix and disclosure:** Once a fix is ready, we will coordinate with you on an appropriate disclosure timeline.

## What Qualifies as a Security Issue

Security issues include, but are not limited to:

- Authentication or authorization bypasses
- Injection vulnerabilities (SQL, command, etc.)
- Cross-site scripting (XSS) or cross-site request forgery (CSRF)
- Exposure of sensitive data (credentials, tokens, personal information)
- Remote code execution
- Privilege escalation
- Denial of service vulnerabilities with a clear exploit path

The following are generally **not** security issues and should be filed as regular bug reports:

- Application crashes without a security impact
- UI/UX bugs
- Performance issues
- Feature requests
- Issues requiring physical access to a user's device

If you are unsure whether something qualifies as a security issue, err on the side of caution and report it through the private vulnerability reporting process.

## Coordinated Disclosure

We follow a coordinated disclosure model:

1. The reporter submits the vulnerability privately.
2. We work to verify and develop a fix.
3. We coordinate with the reporter on a disclosure date, typically once a fix has been released.
4. We publicly disclose the vulnerability along with credit to the reporter (unless anonymity is requested).

We ask that reporters refrain from publicly disclosing the vulnerability until we have had a reasonable opportunity to address it.

## Thank You

We appreciate the efforts of security researchers and community members who help keep this project safe. Responsible disclosure makes a meaningful difference.
