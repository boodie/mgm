
import * as express from 'express';
import { PersistanceLayer, PendingUserInstance, UserInstance } from '../database';
import { UUIDString } from '../util/UUID';
import { EmailMgr } from '../util/Email';
import { Credential } from '../auth/Credential';

export function RegisterHandler(db: PersistanceLayer, templates: { [key: string]: string }): express.Router {
  let router: express.Router = express.Router();

  router.post('/submit', (req, res) => {
    let name: string = req.body.name;
    let email = req.body.email;
    let template = req.body.gender;
    let password = req.body.password;
    let summary = req.body.summary;

    // FORM VALIDATION
    if (!name || !email || !template || !password || !summary) {
      return res.send(JSON.stringify({ Success: false, Message: 'Incomplete Registration Form' }));
    }

    if (name.split(' ').length != 2) {
      return res.send(JSON.stringify({ Success: false, Message: 'Invalid username' }));
    }

    if (!/(.+)@(.+){2,}\.(.+){2,}/.test(email)) {
      return res.send(JSON.stringify({ Success: false, Message: 'Invalid email' }));
    }

    if (!(template in templates)) {
      return res.send(JSON.stringify({ Success: false, Message: 'Invalid template selector' }));
    }

    if (password === '') {
      return res.send(JSON.stringify({ Success: false, Message: 'Empty password is not allowed' }));
    }

    if (summary === '') {
      return res.send(JSON.stringify({ Success: false, Message: 'Empty summary is not allowed' }));
    }

    //ensure no duplicate names
    db.Users.getAll().then((users: UserInstance[]) => {
      for (let u of users) {
        if (u.username.toLowerCase() + ' ' + u.lastname.toLowerCase() === name.toLowerCase()) {
          throw new Error('Name is already in use by a registered user');
        }
      }
    }).then(() => {
      return db.PendingUsers.getAll();
    }).then((users: PendingUserInstance[]) => {
      for (let u of users) {
        if (u.name.toLowerCase() === name.toLowerCase()) {
          throw new Error('Name is already in use by an applicant user');
        }
        if(u.email === email) {
          throw new Error('registration emails must be unique');
        }
      }
    }).then( () => {
      return db.PendingUsers.create(name, email, template, Credential.fromPlaintext(password), summary);
    }).then( () => {
      return EmailMgr.instance().registrationSuccessfull(name, email);
    }).then( () => {
      res.send(JSON.stringify({ Success: true }));
    }).then(() => {
      EmailMgr.instance().notifyAdminUserPending(name, email);
    }).catch((err: Error) => {
      console.log(err);
      res.send(JSON.stringify({ Success: false, Message: err.message }));
    });

  });

  return router;
}
