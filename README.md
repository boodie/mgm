# mgm

MGM is a grid manager for project MOSES, a self-contained deployment strategy for OpenSimulator-based virtual worlds.  You can read more at militarymetaverse.org

MGM is one half of a grid management solution for OpenSimulator, and now specifically the Halcyon branch.  MGM is a user management, process management, content, and region deployment web application.  When coupled with mgmNode, which is another process that confiugred and launches processes on command from MGM, allows a user to create estates, create regions, deploy the regions to servers, and start them from a single authenticated web interface.

# Current Status

This codebase is in active use, and is updated as problems are found.  It is currently in the process of separating concerns to enable microservice deployment and partial functionality replacements, but is currently a single process.

It uses two separate ports, 3000 and 3001.  3000 is for html client interaction, while 3001 is for receiving updates and uploads from mgmNode processes.

MGM is entirely JWT based, and does not use html cookies in any way.

This is open development.  Both issues and pull requests are welcome.

# Upgrading

This branch does not perform any MySQL migration.  If you are on an older version of MGM, reference the SQL files under serverFiles.  We have a version number inserted, but no automated way to migrate the database at this time.

# Installation

typings install
npm install
cp settings.js.example settings.js && vim settings.js

# Compilation

This project is written in typescript, and must be compiled before it can be used

compile client: npm run build-client
compile server: npm run build-server

compile client in production mode:  npm run build-client-production

There are cli js scripts that are compiled when you compile the server that may prove useful:
  migrate-db: test and migrate the sql database using the sql files found in server/Files, in order.
  create-user: create a valid halcyon/mgm user from the command line.  Useful for batch scripting, or creating your initial template and administrative accounts.

# Deployment

The server on port 3000 serves the MGM Single-Page-Application with html5 pushstate.  As all of the client files are located in the same directory, it is possible and recommended to set up nginx with ssl, and proxy only the /api routes to MGM.
 

# Migration

There are no migration tools provided at this time for either OpenSimulator, or Simiangrid based Grids.  While OAR files are supported, several functions were implemented separately in halcyon from opensim, so anything reliant on osFunctions to operate will be broken until they can be modified to use halcyon function calls.
