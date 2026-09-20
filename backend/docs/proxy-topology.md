# Production proxy topology and IP attribution

TAGAD resolves client addresses through Express `req.ip`, with the socket address
as a fallback. Audit logging, access logging and rate limiting never read raw
`X-Forwarded-For` values as authoritative client identities.

## Configuration

| TRUST_PROXY | Behavior |
| --- | --- |
| Unset, empty, or `false` | Default. Ignore forwarded addresses; use the connecting peer. |
| `loopback` or explicit IP/CIDR list | Trust only matching peers; walk the chain from right to left to the nearest untrusted address. |
| `1`, `2`, etc. | Trust a fixed number of hops. Safe only when every ingress path has that exact topology and direct backend access is blocked. |
| `true` | Rejected at startup; unrestricted trust permits forged client addresses. |

Negative, fractional and invalid numeric hop counts fail startup. Express rejects
invalid address/CIDR configuration. Comma-separated address lists are supported.

## Deployment topology contract

The repository does not establish the actual deployed ingress topology. Do not
assume a Cloud Run, CDN or load balancer hop count from a provider name. Record the
verified deployment here before enabling proxy trust:

- Public hostname and ingress provider: deployment-specific, not yet verified.
- Ordered ingress chain and permitted peer addresses: deployment-specific.
- Whether any alternate or direct route reaches Node: must be verified.
- Header replacement/append behavior at each trusted ingress: must be verified.

For a single local Nginx ingress, the intended chain is
`client -> Nginx -> Node (loopback-only listener or network-restricted port)`.
Set `TRUST_PROXY=loopback` only when the Node peer is actually loopback. For a
separate ingress container, use its narrow verified IP/CIDR instead. The public
edge should replace untrusted forwarding headers:

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
```

An internal proxy may append to a chain sanitized by the public edge. For multiple
proxies, explicitly trust their addresses and ensure there is no shorter ingress
path that defeats a configured hop count. Restrict backend network access to the
ingress; an Express setting does not enforce that network restriction.

`tests/ipAttributionProxy.test.ts` makes real HTTP requests through Express using
the production parser. It covers untrusted peers, trusted hops and CIDRs,
multiple proxies, forged prefixes, audit attribution and rate-limit bypass.
These local tests do not certify the deployment's network configuration.

Reference: [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/).
