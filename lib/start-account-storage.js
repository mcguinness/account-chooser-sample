/**
 * startAccountStorage(trustedRootDomains)
 *
 * Initializes the AccountChooser iframe storage listener. Responds to messages
 * to store, get, and delete accounts across origins.
 *
 * Example:
 *
 *   To listen to any valid message from okta.com and oktapreview.com:
 *
 *   startAccountStorage([
 *     'okta.com',
 *     'oktapreview.com'
 *   ]);
 *
 * Messages are sent in the format:
 *
 *   { messageType: {{message_type}},
 *     any: 'other',
 *     data: 'you need to send' }
 *
 * Example:
 *
 *   iframeWindow.postMessage(
 *     { messageType: 'get_accounts' },
 *     'https://login.okta.com'
 *   );
 *
 * Valid messages are 'get_accounts', 'remove_account', and 'login'.
 */
/* eslint max-statements:0 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  }
  else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  else {
    root.startAccountStorage = factory();
  }
}(this, function () {

  var STORAGE_KEY = 'okta_accounts',
      MAX_CACHE = 5;

  /**
   * Base storage access functions. AccountStorage uses the browser's native
   * localStorage object to persist account data.
   */

  function getAccounts() {
    try {
      var accounts = localStorage.getItem(STORAGE_KEY);
      return accounts ? JSON.parse(accounts) : [];
    }
    catch (e) {
      return [];
    }
  }

  function updateAccounts(fn) {
    var accounts = fn(getAccounts());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }

  function removeById(accounts, accountId) {
    return accounts.filter(function (account) {
      return account.id !== accountId;
    });
  }

  /**
   * Message handlers
   *
   * handlers is a map of data.messageType to processing functions.
   *
   * Processing function:
   *   F(e.data, e.origin) -> { responseMessage }
   *
   * The responseMessage is an optional object with any extra data that should
   * be posted back to e.origin after the message has been processed, sans the
   * response messageType (which is added later).
   */

  var handlers = {};

  /**
   * Stores a new account login.
   *
   * Expects:
   *
   *   { messageType: 'login',
   *     login: user login,
   *     displayName: user display name }
   *
   * Responds with:
   *
   *   { messageType: 'processed_login' }
   */
  handlers['login'] = function (data, origin) {
    var newAccount = {
      id: origin + '::' + data.login,
      login: data.login,
      displayName: data.displayName,
      origin: origin,
      lastUpdated: new Date().toISOString()
    };
    updateAccounts(function (accounts) {
      // Remove any previous login by same user
      var filtered = removeById(accounts, newAccount.id);

      // Add new account to beginning of accounts list
      filtered.unshift(newAccount);

      // Only cache the most recent MAX_CACHE items
      return filtered.slice(0, MAX_CACHE);
    });
  };

  /**
   * Gets stored accounts
   *
   * Expects:
   *
   *   { messageType: 'get_accounts' }
   *
   * Responds with:
   *
   *   { messageType: 'processed_get_accounts',
   *     accounts: [
   *       { id: some distinct id,
   *         displayName: user display name,
   *         login: user login,
   *         origin: the origin original login message came from,
   *         lastUpdated: ISO date string when this account was last updated },
   *       ...
   *     ] }
   */
  handlers['get_accounts'] = function () {
    return { accounts: getAccounts() };
  };

  /**
   * Removes an account by id
   *
   * Expects:
   *
   *   { messageType: 'remove_account',
   *     accountId: the account id }
   *
   * Responds with:
   *
   * { messageType: 'processed_remove_account' }
   */
  handlers['remove_account'] = function (data) {
    updateAccounts(function (accounts) {
      return removeById(accounts, data.accountId);
    });
    return { accountId: data.accountId };
  };

  /**
   * Validates whether the message should be handled.
   * - Test if the message has a data object with a valid message handler
   * - Test if the message is coming from a trusted root domain
   */
  function isValidMessage(trustedRootDomains, e) {
    var origin = e.origin,
        data = e.data;
    if (!data || typeof data !== 'object' || !handlers[data.messageType]) {
      return false;
    }
    return trustedRootDomains.some(function (trustedRootDomain) {
      var root = '.' + trustedRootDomain,
          end = origin.substr(-1 * root.length),
          isRootDomain = end === root,
          isHttps = origin.substr(0, 8) === 'https://';
      return isRootDomain && isHttps;
    });
  }

  /**
   * Invokes the appropriate processing function, and posts a response if
   * the message was successfully processed.
   *
   * Note: All valid messages will post a response message to e.origin after
   * processing. The messageType will be processed_{{originalMessageType}}.
   */
  function handleMessage(trustedRootDomains, e) {
    if (!isValidMessage(trustedRootDomains, e)) {
      return;
    }
    var res = handlers[e.data.messageType](e.data, e.origin) || {};
    res.messageType = 'processed_' + e.data.messageType;
    e.source.postMessage(res, e.origin);
  }

  function startAccountStorage(trustedRootDomains) {
    // Register the event listener to respond to incoming events immediately
    // once this function is called.
    var listener = handleMessage.bind(null, trustedRootDomains);
    addEventListener('message', listener, false);
  }

  return startAccountStorage;

}));
