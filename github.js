
require('dotenv').config();
const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('ERROR GITHUB TOKEN NEEDED');
  process.exit(0);
}
console.log(token);

const fs = require('fs');
const github = require('octonode');
const sleep = require('system-sleep');
const client = github.client(token);
const org = client.org('org');
const jsonfile = require('jsonfile')

// ---------------------------------------------------------------------
function getMembers(page, filter, cb) {
    var f = {page: page, per_page: 100, ...filter};
    console.log(f);
    
    org.members(f, function(err, results) {
      if (!err) {
        cb(false, results);
      }
      else {
        cb(err, null);
      }
    })
}

var members = [];
var members2f = [];
var usersData = [];

// ---------------------------------------------------------------------
function getAllMembers(page, cb) {
  console.log(`Page ${page}`);
  getMembers(page, {}, (err, data) => {
    if (!err) {
      if (data.length == 0) {
        cb(members);
      }
      else {
        for(let user of data) {
          members.push(user);
        }
        page++
        getAllMembers(page, cb);
      }
    }   
    else {
      console.error('error', err);
    } 
  });
}

// ---------------------------------------------------------------------
function getAll2FMembers(page, cb) {
  console.log(`2f Page ${page}`);
  getMembers(page, {filter: '2fa_disabled'}, (err, data) => {
    if (!err) {
      if (data.length == 0) {
        cb(members2f);
      }
      else {
        for(let user of data) {
          members2f.push(user);
        }
        page++
        getAll2FMembers(page, cb);
      }
    }   
    else {
      members2f = []
      cb(members2f);
      console.error('error', err);
    } 
  });
}

// ---------------------------------------------------------------------
function getUserDetails(username, cb) {
  client.get(`/users/${username}`, {}, function (err, status, body, headers) {
    if(!err) cb(false, body);
    else cb(err, null);
  });
}

// ---------------------------------------------------------------------
function getAllUserDetails(i, cb) {
  console.log(`User ${members[i].login}`);
  getUserDetails(members[i].login, (err, data) => {
    if (!err) {

      usersData.push(data);

      if (i >= members.length-1) {
        cb(usersData);
      }
      else {
        i++;
        getAllUserDetails(i, cb);
      }
    }
  })
}

// ---------------------------------------------------------------------
function saveData(members) {
  console.log('--------------------------------------');

  for(var user of members) {
    user.has_2f = false;
    for(var user2f of members2f) {
      if (user2f.id === user.id) {
        user.has_2f = true;
      }
    }
    
    console.log(`Name: ${user.name}`);
    console.log(`Login: ${user.login}`);
    console.log(`Company: ${user.company}`);
    console.log(`ID: ${user.id}\n\n`);
  }
  
  var data = {
    saved_on: new Date(),
    total: members.length,
    members: members
  };
  
  jsonfile.writeFile('members.json', data, {spaces: 2}, function (err) {
    if (err) console.error(err)
    else {
      console.log("Members file saved");
    }
  })

  console.log('--------------------------------------');
}




// RUN
// ---------------------------------------------------------------------

console.log('Get All Public Members');

getAllMembers(0, (members) => {
  getAll2FMembers(0, members2f => {

    console.log(`Total members ${members.length}`);

    getAllUserDetails(0, users => {
      if (users) {
        saveData(users);
      }
    })
  })
})

