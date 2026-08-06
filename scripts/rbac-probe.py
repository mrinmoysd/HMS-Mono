#!/usr/bin/env python3
"""Probe an endpoint across all eight demo roles and print an allow/deny grid.

Written after two probe runs reported the wrong answer: a 404 (route not
mounted) and a 401 (token no longer valid) both look like "not a 403" and were
printed as `allow`. Only 2xx is allow. Everything else gets named.

Usage:  python3 scripts/rbac-probe.py GET /hr/leaves
        python3 scripts/rbac-probe.py POST /hr/leaves '{}'
Never point a DELETE at a real seeded id — use the GHOST uuid below.
"""
import json, os, sys, urllib.request, urllib.error

# Override to probe another environment, e.g.
#   RBAC_PROBE_BASE=http://130.210.38.184/api/v1 python3 scripts/rbac-probe.py GET /opd
# Against production, use GET only. Nothing in this script is read-only by
# construction — that is the operator's responsibility.
BASE = os.environ.get('RBAC_PROBE_BASE', 'http://localhost:4000/api/v1')
GHOST = '00000000-0000-4000-8000-000000000000'
ROLES = ['admin', 'accountant', 'doctor', 'pharmacist',
         'pathologist', 'radiologist', 'receptionist', 'nurse']


def login(u):
    r = urllib.request.Request(BASE + '/auth/login',
                               data=json.dumps({'username': u, 'password': 'password'}).encode(),
                               headers={'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(r))
    return d['tokens']['accessToken'], d['user']['id']


def code(tok, path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Authorization': 'Bearer ' + tok}
    if data:
        h['Content-Type'] = 'application/json'
    try:
        r = urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method))
        return r.status
    except urllib.error.HTTPError as e:
        return e.code


def verdict(c):
    """Only 2xx is allow. 403 is the guard denying. Everything else is named,
    because a silent 401/404 masquerading as `allow` invalidates the whole run."""
    if 200 <= c < 300:
        return 'allow'
    if c == 403:
        return 'DENY'
    if c == 401:
        return '401!'          # token rejected — the probe is broken, not the guard
    if c == 404:
        return '404!'          # route not mounted at this path
    if c in (400, 422):
        return 'pass'          # guard allowed; handler rejected the stub payload
    return str(c)


def main():
    method, path = sys.argv[1].upper(), sys.argv[2]
    body = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    tok = {r: login(r)[0] for r in ROLES}
    print(''.join(r[:5].rjust(7) for r in ROLES))
    print(''.join(verdict(code(tok[r], path, method, body)).rjust(7) for r in ROLES))


if __name__ == '__main__':
    main()
