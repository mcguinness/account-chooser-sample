var expect = require('chai').expect,
    sinon = require('sinon'),
    rewire = require('rewire'),
    startAccountStorage = rewire('../lib/start-account-storage');

var ISO_DATE = '2016-08-16T23:04:15.778Z',
    ISO_DATE_2 = '2016-08-16T23:04:20.888Z';

function setup(options) {
  options = options || {};

  var registeredListener;
  function setRegisteredListener(type, listener) {
    registeredListener = listener;
  }

  var spies = {
    addEventListener: sinon.spy(setRegisteredListener),
    sourcePostMessage: sinon.spy(),
    lsSetItem: sinon.spy(),
    lsGetItem: sinon.stub().withArgs('okta_accounts')
  };
  startAccountStorage.__set__({
    addEventListener: spies.addEventListener,
    localStorage: {
      setItem: spies.lsSetItem,
      getItem: spies.lsGetItem
    }
  });

  var isoDate = options.newAccountIsoDate || ISO_DATE;
  sinon.stub(Date.prototype, 'toISOString').returns(isoDate);

  startAccountStorage([
    'okta.com',
    'oktapreview.com',
    'okta-emea.com'
  ]);

  return {
    spies: spies,
    sendMessage: function (message, sourceOrigin) {
      var event = {
        origin: sourceOrigin,
        data: message,
        source: {
          postMessage: spies.sourcePostMessage
        }
      };
      registeredListener(event);
    }
  };
}

function stubAccounts(test, accounts) {
  var data = accounts ? JSON.stringify(accounts) : null;
  test.spies.lsGetItem.onCall(0).returns(data);
}

function expectAccountsChange(options) {
  var test = setup({ 
    newAccountIsoDate: options.newAccountIsoDate
  });

  stubAccounts(test, options.startingLocalStorageState);
  test.sendMessage(options.message.data, options.message.origin);
  expect(test.spies.lsGetItem.callCount).to.equal(1);

  var spy = test.spies.lsSetItem;
  expect(spy.callCount).to.equal(1);
  expect(spy.args[0][0]).to.equal('okta_accounts');
  expect(JSON.parse(spy.args[0][1])).to.eql(options.finalLocalStorageSet);
}

function itDoesNotTrust(origin) {
  it('does not trust ' + origin, function () {
    var test = setup();
    test.sendMessage({ messageType: 'get_accounts' }, origin);
    expect(test.spies.sourcePostMessage.callCount).to.equal(0);
    expect(test.spies.lsSetItem.callCount).to.equal(0); 
  });
}

describe('startAccountStorage', function () {

  afterEach(function () {
    Date.prototype.toISOString.restore();
  });

  describe('General', function () {
    it('registers message handler when startAccountStorage is called', function () {
      var test = setup(),
          spy = test.spies.addEventListener;
      expect(spy.callCount).to.equal(1);
      // Test the message type, and useCapture. Listener will be tested in
      // subsequent tests.
      expect(spy.args[0][0]).to.equal('message');
      expect(spy.args[0][2]).to.equal(false);
    });
    it('does nothing if there is no valid messageType data', function () {
      var test = setup();
      test.sendMessage({}, 'https://a.okta.com');
      expect(test.spies.sourcePostMessage.callCount).to.equal(0);
      expect(test.spies.lsSetItem.callCount).to.equal(0);
    });
    itDoesNotTrust('http://a.okta.com');
    itDoesNotTrust('https://evilokta.com');
    itDoesNotTrust('https://evil.com');
    itDoesNotTrust('https://a.evil.com');
    itDoesNotTrust('https://a.okta.com.evil.com');
    itDoesNotTrust('https://a.b.oktascom');
    itDoesNotTrust('https://a.okta.com:8080');
  });

  describe('Messages', function () {

    describe('login', function () {
      it('adds account when there are no existing accounts', function () {
        expectAccountsChange({
          startingLocalStorageState: null,
          message: {
            origin: 'https://a.okta.com',
            data: {
              messageType: 'login',
              displayName: 'Alexander Hamilton',
              login: 'aham'
            }
          },
          finalLocalStorageSet: [
            {
              id: 'https://a.okta.com::aham',
              displayName: 'Alexander Hamilton',
              login: 'aham',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            }
          ]
        });
      });
      it('adds account to front of list when there are existing accounts', function () {
        expectAccountsChange({
          startingLocalStorageState: [
            {
              id: 'https://a.okta.com::aham',
              displayName: 'Alexander Hamilton',
              login: 'aham',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            } 
          ],
          message: {
            origin: 'https://b.okta.com',
            data: {
              messageType: 'login',
              displayName: 'Thomas Jefferson',
              login: 'tjeff'
            }
          },
          finalLocalStorageSet: [
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::aham',
              displayName: 'Alexander Hamilton',
              login: 'aham',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            }
          ]
        });
      });
      it('removes any duplicated logins if user logs in with same account', function () {
        expectAccountsChange({
          startingLocalStorageState: [
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta-emea.com::gwash',
              displayName: 'George Washington',
              login: 'gwash',
              origin: 'https://a.okta-emea.com',
              lastUpdated: ISO_DATE 
            } 
          ],
          message: {
            origin: 'https://a.okta-emea.com',
            data: {
              messageType: 'login',
              displayName: 'George Washington',
              login: 'gwash'
            }
          },
          newAccountIsoDate: ISO_DATE_2,
          finalLocalStorageSet: [
            {
              id: 'https://a.okta-emea.com::gwash',
              displayName: 'George Washington',
              login: 'gwash',
              origin: 'https://a.okta-emea.com',
              lastUpdated: ISO_DATE_2
            }, 
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            }
          ]
        });
      });
      it('only caches last 5 logins (FIFO)', function () {
        expectAccountsChange({
          startingLocalStorageState: [
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::aham',
              displayName: 'Alexander Hamilton',
              login: 'aham',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::gwash',
              displayName: 'George Washington',
              login: 'gwash',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://d.okta.com::aburr',
              displayName: 'Aaron Burr',
              login: 'aburr',
              origin: 'https://d.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::bf',
              displayName: 'Ben Franklin',
              login: 'bf',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            }  
          ],
          message: {
            origin: 'https://a.oktapreview.com',
            data: {
              messageType: 'login',
              displayName: 'James Madison',
              login: 'jmad'
            }
          },
          finalLocalStorageSet: [
            {
              id: 'https://a.oktapreview.com::jmad',
              displayName: 'James Madison',
              login: 'jmad',
              origin: 'https://a.oktapreview.com',
              lastUpdated: ISO_DATE
            },
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::aham',
              displayName: 'Alexander Hamilton',
              login: 'aham',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::gwash',
              displayName: 'George Washington',
              login: 'gwash',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://d.okta.com::aburr',
              displayName: 'Aaron Burr',
              login: 'aburr',
              origin: 'https://d.okta.com',
              lastUpdated: ISO_DATE 
            }
          ]
        });
      });
      it('posts a processed_login response', function () {
        var test = setup(),
            spy = test.spies.sourcePostMessage;
        stubAccounts(test, null);
        test.sendMessage({
          messageType: 'login',
          displayName: 'James Madison',
          login: 'jmad'
        }, 'https://a.okta.com');
        expect(spy.callCount).to.equal(1);
        expect(spy.args[0]).to.eql([
          { messageType: 'processed_login' },
          'https://a.okta.com'
        ]);
      });
    });

    describe('get_accounts', function () {
      it('posts accounts in processed_get_accounts response when there are cached accounts', function () {
        var test = setup(),
            spy = test.spies.sourcePostMessage;

        var accounts = [
          {
            id: 'https://a.okta.com::gwash',
            displayName: 'George Washington',
            login: 'gwash',
            origin: 'https://a.okta.com',
            lastUpdated: ISO_DATE 
          },
          {
            id: 'https://d.okta.com::aburr',
            displayName: 'Aaron Burr',
            login: 'aburr',
            origin: 'https://d.okta.com',
            lastUpdated: ISO_DATE 
          }
        ];
        stubAccounts(test, accounts);
        test.sendMessage({ messageType: 'get_accounts' }, 'https://a.okta.com');

        expect(spy.callCount).to.equal(1);
        expect(spy.args[0]).to.eql([
          { 
            messageType: 'processed_get_accounts',
            accounts: accounts
          },
          'https://a.okta.com'
        ]);
      });
      it('posts an empty list when there are no cached accounts', function () {
        var test = setup(),
            spy = test.spies.sourcePostMessage;

        stubAccounts(test, null);
        test.sendMessage({ messageType: 'get_accounts' }, 'https://a.okta.com');

        expect(spy.callCount).to.equal(1);
        expect(spy.args[0]).to.eql([
          { 
            messageType: 'processed_get_accounts',
            accounts: [] 
          },
          'https://a.okta.com'
        ]);
      });
    });

    describe('remove_account', function () {
      it('removes an account by id', function () {
        expectAccountsChange({
          startingLocalStorageState: [
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            },
            {
              id: 'https://a.okta.com::gwash',
              displayName: 'George Washington',
              login: 'gwash',
              origin: 'https://a.okta.com',
              lastUpdated: ISO_DATE 
            } 
          ],
          message: {
            origin: 'https://a.okta.com',
            data: {
              messageType: 'remove_account',
              accountId: 'https://a.okta.com::gwash'
            }
          },
          finalLocalStorageSet: [
            {
              id: 'https://b.okta.com::tjeff',
              displayName: 'Thomas Jefferson',
              login: 'tjeff',
              origin: 'https://b.okta.com',
              lastUpdated: ISO_DATE 
            }
          ]
        });
      });
      it('posts a processed_remove_account response', function () {
        var test = setup(),
            spy = test.spies.sourcePostMessage;
        stubAccounts(test, null);
        test.sendMessage({
          messageType: 'remove_account',
          accountId: 'foo'
        }, 'https://a.okta.com');
        expect(spy.callCount).to.equal(1);
        expect(spy.args[0]).to.eql([
          { messageType: 'processed_remove_account' },
          'https://a.okta.com'
        ]);
      });
    });

  });

});