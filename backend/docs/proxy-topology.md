# Production Proxy Topology & IP Attribution Specification

## 1. Overview & Security Rationale

In modern cloud and container deployments (Google Cloud Run, AWS ECS/ALB, Kubernetes Ingress, or Nginx reverse proxies), client HTTP traffic passes through one or more intermediate reverse proxy layers before terminating at the TAGAD Node.js Express backend.

### The IP Spoofing Vulnerability (F-6)
If an application reads the `X-Forwarded-For` HTTP header directly (e.g. `req.headers['x-forwarded-for']`), an untrusted client can send an arbitrary forged header such as:
```http
X-Forwarded-For: 8.8.8.8
```
If blindly accepted:
1. **Audit trail falsification**: Administrative actions and mutations are recorded with forged IPs.
2. **Rate limiting bypass**: Attackers can rotate spoofed IP headers to evade rate limits.
3. **Security logging distortion**: Forensic incident investigations are misled.

---

## 2. Express Trusted Proxy Architecture

The TAGAD backend configures Express's native trusted proxy engine via `app.set('trust proxy', trustProxyConfig)` in `backend/server.ts`.

### Authoritative IP Extraction
All backend services and middlewares extract the client IP strictly via framework-resolved `req.ip`:
- **Audit Logging** (`AuditService.ts`): Captures `params.req.ip` for immutable audit records.
- **Rate Limiters** (`rateLimiter.ts`): Keys login and feedback throttle buckets by `req.ip`.
- **Request Tracing** (`requestLogger.ts`): Emits structured access logs with `req.ip`.

---

## 3. Configuration Matrix (`TRUST_PROXY`)

The `TRUST_PROXY` environment variable dictates how Express interprets upstream proxy hops:

| Environment Setting | Express Config | Deployment Use Case | Behavior |
| :--- | :--- | :--- | :--- |
| `TRUST_PROXY=1` (Default) | `1` (Single hop) | **Google Cloud Run**, AWS ALB, standard Nginx reverse proxy | Trusts the immediate upstream proxy and extracts the last client hop added by the load balancer. Ignores client-forged prefix headers. |
| `TRUST_PROXY=2` | `2` (Two hops) | Cloudflare / CDN → Nginx → Node backend | Trusts two proxy hops, resolving the true end-user IP from the external edge. |
| `TRUST_PROXY=false` | `false` | Direct bare-metal or container without reverse proxy | Ignores all `X-Forwarded-For` headers; sets `req.ip` directly to TCP socket `remoteAddress`. |
| `TRUST_PROXY="10.0.0.0/8"` | CIDR Subnet | Private VPC with internal load balancers | Only trusts reverse proxies within the specified private IP subnet. |

---

## 4. Production Deployment Guidelines

1. **Cloud Run / Container Ingress**:
   - Keep `TRUST_PROXY=1` in your `.env.production`.
   - Cloud Run terminates TLS and strips or appends client IPs safely into `X-Forwarded-For`.
2. **Nginx Reverse Proxy Configuration**:
   - Ensure your Nginx configuration sets `$proxy_add_x_forwarded_for` and `$remote_addr`:
     ```nginx
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
     ```
3. **Testing Proxy Trust**:
   - Automated tests in `backend/tests/ipAttributionProxy.test.ts` verify that spoofed headers are rejected when `trust proxy` is disabled, and correctly resolved when behind a trusted hop.

