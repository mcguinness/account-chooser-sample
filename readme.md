# Overview

Okta Account Chooser that leverages [Web Messaging](https://html.spec.whatwg.org/multipage/comms.html#web-messaging) with hidden iframe to provide an account chooser across Okta organizations

# Setup

Install package dependencies

`npm install`

1. Add a DNS entry to your `/etc/hosts` file
- `127.0.0.1 login.okta.io`

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

# Development

1. Run `npm start` to launch web server on https
1. Launch `https://login.okta.io:8080/test.html` and add an account
2. Launch `https://login.okta.io:8080` and select account

> You may get a certificate warning as the site uses non-trusted certificate authority for HTTPS

## Test

To run lint and unit tests:

```bash
[account-chooser-sample]$ npm test
```

# Build

1. Run `npm install`
2. Run 'npm run build'

The build will output to the `./dist` folder.  Use this folder to publish.
