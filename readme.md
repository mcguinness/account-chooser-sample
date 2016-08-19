# Overview

A technology sample that leverages [Web Messaging](https://html.spec.whatwg.org/multipage/comms.html#web-messaging) with hidden iframe to provide an account chooser across domains

# Setup

Install packages

`npm install`

This demo is currently coded to only allow requests from `*.okta.io:8080` origins.

1. Add 2 DNS entries to your `/etc/hosts` file
- `127.0.0.1 login.okta.io`
- `127.0.0.1 example.okta.io`

## Trusted Origin Whitelist

This project implements a root domain whitelist that only allows trusted callers.  This is a security-best practice for cross-origin web messaging.

You can modify the whitelist by changing the following variables:

index.html

```js
var iframeOrigin = 'https://login.okta.io:8080';
```

discovery/iframe.html

```js
var trustedRootDomains = ['okta.io:8080'];
```

# Demo

1. Run `npm start` to launch web server
1. Launch `https://login.okta.io:8080/test.html` and add an account
2. Launch `https://login.okta.io:8080` and select account

## Development

To run lint and unit tests:

```bash
[account-chooser-sample]$ npm test
```
