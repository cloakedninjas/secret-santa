const fs = require('fs');
const sinon = require('sinon');
const expect = require('chai').expect;
const ejs = require('ejs');
const app = require('./app');
const SendGridAdapter = require('../adapters/send-grid');

describe('App', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('ensureLoggedIn()', () => {
    it('should redirect to admin if a user is present and /login is requested', () => {
      let req = {
        session: {
          user: true
        },
        url: '/login'
      };

      let res = {
        redirect: (route) => {
          expect(route).to.equal('/admin');
        }
      };

      app.ensureLoggedIn(req, res);
    });

    it('should issue a 401 when not logged in, then render login page', () => {
      let req = {
        session: {
          user: null
        },
        url: '/secret-page'
      };

      let res = {
        status: (code) => {
          expect(code).to.equal(401);
        },
        render: (page) => {
          expect(page).to.equal('login');
        }
      };

      app.ensureLoggedIn(req, res);
    });

    it('should continue to next middleware if authenticated', (done) => {
      let req = {
        session: {
          user: true
        },
        url: '/secret-page'
      };

      let next = () => {
        done();
      };

      app.ensureLoggedIn(req, null, next);
    });
  });

  describe('initSession()', () => {
    it('should set the session var', () => {
      let req = {
        session: {}
      };

      app.initSession(req);

      expect(req.session.user).to.equal(true);
    });
  });

  describe('haveEmailsAlreadySent()', () => {
    const dummyListLocation = './app/config/test-list.json';

    before(() => {
      app.listLocation = dummyListLocation;
    });

    after(() => {
      fs.unlinkSync(dummyListLocation);
    });

    it('should return true if list exists', () => {
      expect(app.haveEmailsAlreadySent()).to.equal(false);

      fs.writeFileSync(dummyListLocation, '{}');
      expect(app.haveEmailsAlreadySent()).to.equal(true);
    });
  });

  describe('createAndSendEmails()', () => {
    it('should allocate and send emails', () => {
      let assign = sandbox.stub(app, 'assignRecipients');
      let composeEmails = sandbox.stub(app, 'composeEmails');
      let sendEmails = sandbox.stub(app, 'sendEmails');
      let list = [
        {
          person: 'alice@test.com',
          recipient: 'bob@test.com'
        }, {
          person: 'bob@test.com',
          recipient: 'alice@test.com'
        }
      ];
      let messages = [
        {
          to: 'someone@test.com',
          subject: 'Hello'
        }
      ];

      assign.returns(list);
      composeEmails.returns(messages);

      app.createAndSendEmails();

      expect(composeEmails.calledWith(list)).to.equal(true, 'call composeEmails with list');
      expect(sendEmails.calledWith(messages)).to.equal(true, 'call sendEmails with messages');
    });
  });

  describe('resendRecipientList()', () => {
    const dummyListLocation = './app/config/test-list.json';

    before(() => {
      app.listLocation = dummyListLocation;

      let list = [
        {
          person: 'alice@test.com',
          recipient: 'bob@test.com'
        }, {
          person: 'bob@test.com',
          recipient: 'alice@test.com'
        }
      ];

      fs.writeFileSync(dummyListLocation, JSON.stringify(list));
    });

    after(() => {
      fs.unlinkSync(dummyListLocation);
    });

    it('should send emails from existing list', () => {
      let composeEmails = sandbox.stub(app, 'composeEmails');
      let sendEmails = sandbox.stub(app, 'sendEmails');
      let list = [
        {
          person: 'alice@test.com',
          recipient: 'bob@test.com'
        }, {
          person: 'bob@test.com',
          recipient: 'alice@test.com'
        }
      ];
      let messages = [
        {
          to: 'someone@test.com',
          subject: 'Hello'
        }
      ];

      composeEmails.returns(messages);

      app.resendRecipientList();

      expect(composeEmails.calledWith(list)).to.equal(true, 'call composeEmails with list');
      expect(sendEmails.calledWith(messages)).to.equal(true, 'call sendEmails with messages');
    });
  });

  describe('assignRecipients()', () => {
    const dummyListLocation = './app/config/test-list.json';

    beforeEach(() => {
      app.listLocation = dummyListLocation;
    });

    afterEach(() => {
      fs.unlinkSync(dummyListLocation);
    });

    it('should shuffle provided users', () => {
      sandbox.stub(app, 'getStorage').returns({
        subscribers: [
          {'name': 'Alice'},
          {'name': 'Bob'}
        ]
      });
      let shuffle = sandbox.stub(app, 'shuffle').returns([]);

      app.assignRecipients();

      sinon.assert.calledWithMatch(shuffle, [
        {'name': 'Alice'},
        {'name': 'Bob'}
      ]);

      expect(shuffle.called).to.equal(true, 'call shuffle');
    });

    it('should output correct format to correct location', () => {
      sandbox.stub(app, 'getStorage').returns({
        subscribers: []
      });

      sandbox.stub(app, 'shuffle').returns([
        {
          name: 'Alice',
          email: 'alice@test.com'
        }, {
          name: 'Bob',
          email: 'bob@test.com'
        }, {
          name: 'Charlie',
          email: 'charlie@test.com'
        }
      ]);

      const result = app.assignRecipients();
      const list = JSON.parse(fs.readFileSync(dummyListLocation).toString());

      expect(list).to.have.deep.members([
        {
          person: 'alice@test.com',
          recipient: 'bob@test.com',
          sent: false
        }, {
          person: 'bob@test.com',
          recipient: 'charlie@test.com',
          sent: false
        }, {
          person: 'charlie@test.com',
          recipient: 'alice@test.com',
          sent: false
        }
      ]);

      expect(result).to.deep.equal(list, 'Rerturn value matches saved file');
    });
  });

  describe('getItemByEmail()', () => {
    it('should find items by email', () => {
      const list = [
        {
          name: 'Tim',
          email: 'tim@test.com'
        }, {
          name: 'Jane',
          email: 'jane@test.com'
        }
      ];

      const result = app.getItemByEmail(list, 'jane@test.com');

      expect(result).to.deep.equal({
        name: 'Jane',
        email: 'jane@test.com'
      });
    });

    it('should return null if item is not found', () => {
      const list = [
        {
          name: 'Tim',
          email: 'tim@test.com'
        }, {
          name: 'Jane',
          email: 'jane@test.com'
        }
      ];

      const result = app.getItemByEmail(list, 'daniel@test.com');

      expect(result).to.equal(null);
    });
  });

  describe('composeEmails()', () => {
    it('should compose an email to each subscriber', () => {
      sandbox.stub(app, 'getStorage').returns({
        subscribers: [
          {
            name: 'Alice S.',
            email: 'alice@test.com',
            colour: 'red',
            animal: 'dog',
            idea: 'Toys'
          }, {
            name: 'Bobby',
            email: 'bob@test.com',
            colour: 'green'
          }, {
            name: 'Charles',
            email: 'charlie@test.com'
          }
        ]
      });

      const ejsRender = sandbox.spy(ejs, 'render');
      const emailTemplate = fs.readFileSync('app/views/email.ejs').toString();
      const result = app.composeEmails([
        {
          person: 'alice@test.com',
          recipient: 'bob@test.com'
        }, {
          person: 'bob@test.com',
          recipient: 'charlie@test.com'
        }, {
          person: 'charlie@test.com',
          recipient: 'alice@test.com'
        }
      ]);

      expect(ejsRender.calledWith(emailTemplate, sinon.match.any)).to.equal(true, 'call render with correct template');
      expect(ejsRender.callCount).to.equal(3, 'call render 3 times');
      expect(result.length).to.equal(3, 'return 3 messages');

      expect(result[0].to).to.equal('alice@test.com');
      expect(result[0].subject).to.equal('Your Secret Santa drawing');
      expect(result[0].html).to.match(/Alice S., here is your Secret Santa drawing/);
      expect(result[0].html).to.match(/You have been given Bobby/);
      expect(result[0].html).to.match(/Their favourite colour is: green/);

      expect(result[1].to).to.equal('bob@test.com');
      expect(result[1].subject).to.equal('Your Secret Santa drawing');
      expect(result[1].html).to.match(/Bobby, here is your Secret Santa drawing/);
      expect(result[1].html).to.match(/You have been given Charles/);

      expect(result[2].to).to.equal('charlie@test.com');
      expect(result[2].subject).to.equal('Your Secret Santa drawing');
      expect(result[2].html).to.match(/Charles, here is your Secret Santa drawing/);
      expect(result[2].html).to.match(/You have been given Alice S./);
      expect(result[2].html).to.match(/Their favourite colour is: red/);
      expect(result[2].html).to.match(/Their favourite animal is: dog/);
      expect(result[2].html).to.match(/They suggested: Toys as a potential gift./);
    });
  });

  describe('addSubscriber()', () => {
    const originalStorageLocation = app.storageLocation;
    const dummyStorageLocation = './data/test-storage.json';

    before(() => {
      app.storageLocation = dummyStorageLocation;
      fs.writeFileSync(dummyStorageLocation, '{"subscribers":[]}');
    });

    after(() => {
      app.storageLocation = originalStorageLocation;
      fs.unlinkSync(dummyStorageLocation);
    });

    it('should add a user to storage', () => {
      app.addSubscriber({
        name: 'Leeroy Jenkins',
        email: 'leeroy@example.net',
        colour: 'red'
      });

      const storage = app.getStorage();
      expect(storage.subscribers.length).to.equal(1);
      expect(storage.subscribers[0].name).to.equal('Leeroy Jenkins');
      expect(storage.subscribers[0].email).to.equal('leeroy@example.net');
      expect(storage.subscribers[0].colour).to.equal('red');
    });
  });

  describe('sendEmails()', () => {
    it('should pass through messages to the adapter', () => {
      const stub = sandbox.stub(SendGridAdapter.prototype, 'send');

      app.sendEmails([{
        to: 'test@example.com'
      }]);

      expect(stub.calledWith([{
        to: 'test@example.com'
      }])).to.equal(true);
    });
  });
});
