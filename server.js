var express = require('express'),
	app = express(),
  http = require('http').createServer(app),
	bodyParser = require('body-parser'),
	yelp = require('node-yelp'),
	mongoose = require('mongoose'),
	bcrypt = require('bcryptjs'),
	cors = require('cors'),
	jwt = require('jwt-simple'),
	moment = require('moment'),
	path = require('path'),
	request = require('request'),
  _=require('underscore');

//socket
var io = require('socket.io')(http);

var User = require("./models/user.js"),
	Comment = require("./models/comment.js"),
	Business = require("./models/business.js");

require('dotenv').load();

//connect to mongodb

mongoose.connect(
	process.env.MONGOLAB_URI ||
	process.env.MONGOHQ_URL ||
	'mongodb://localhost/wait'
);

//configure body-parser
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//creating JWT token
function createToken(user) {
  var payload = {
    exp: moment().add(14, 'days').unix(),
    iat: moment().unix(),
    sub: user._id
  };

  return jwt.encode(payload, "tokenSecret");
}

function isAuthenticated(req, res, next) {
  if (!(req.headers.authorization)) {
    return res.status(400).send({ message: 'You did not provide a JSON Web Token in the Authorization header.' });
  }

  var header = req.headers.authorization.split(' ');
  var token = header[1];
  console.log(token)
  
  var payload = null;
  try{
  	payload = jwt.decode(token, "tokenSecret");
  }
  catch (err){
  	return res.status(401).send({message: err.message});
  }
  console.log(payload)
  var now = moment().unix();

  if (payload.exp <= now) {
    return res.status(401).send({ message: 'Token has expired.' });
  }

  User.findById(payload.sub, function(err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User no longer exists.' });
    }

    req.user = payload.sub;
    next();
  })
}

app.post('/auth/login', function(req, res) {
  User.findOne({ email: req.body.email }, '+password').populate("favorites").exec(function(err, user) {
    if (!user) {
      return res.status(401).send({ message: { email: 'Incorrect email' } });
    }

    bcrypt.compare(req.body.password, user.password, function(err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ message: { password: 'Incorrect password' } });
      }

      user = user.toObject();
      delete user.password;

      var token = createToken(user);
      res.send({ token: token, user: user });
    });
  });
});

app.post('/auth/signup', function(req, res) {
  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken.' });
    }

    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });

    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(user.password, salt, function(err, hash) {
        user.password = hash;

        user.save(function() {
          var token = createToken(user);
          res.send({ token: token, user: user });
        });
      });
    });
  });
});

// Request API access: http://www.yelp.com/developers/getting_started/api_access 
var client = yelp.createClient({
  oauth: {
    "consumer_key": process.env.CONSUMER_KEY,
    "consumer_secret": process.env.CONSUMER_SECRET,
    "token": process.env.TOKEN,
    "token_secret": process.env.TOKEN_SECRET
  }
});
 
// See http://www.yelp.com/developers/documentation/v2/search_api 

app.post('/api/search/:s', function (req,res) {
	client.search({
	  term: req.body.term,
	  location: "San Francisco",
	}).then(function (data) {
	  var businesses = data.businesses;
	  var location = data.region;
	  res.json(businesses);
	  // ...  
    _.each(businesses, function(business) {
      Business.findOne({business_id: business.id}, function(err, found) {
        if (!found) {
          var newBusiness = new Business({
            business_id: business.id
          });
          newBusiness.save();
        }
      })
    })
	});
});

app.get('/api/business/:id', function (req,res) {

  client.business(req.params.id, {
    cc: "US"
  }).then(function(data) {
    res.json(data);
  });
})

app.get('/api/waits/:id', function (req,res){
  var bizId = {business_id: req.params.id};
    Business.findOne(bizId, function(err, foundBiz){
      res.json(foundBiz);
      // console.log(foundBiz)
    });
});

app.put('/api/business/:id', function (req,res){
	var bizId = {business_id:req.params.id};
  var party = req.body.party;

	Business.findOne(bizId, function(err, foundBiz){
		// console.log(foundBiz);
		foundBiz[party].wait = req.body.wait;
    console.log(foundBiz[party].wait)
    foundBiz[party].updatedAt = req.body.updated;
    // console.log(req.body.updated);
		foundBiz.save(function(err, savedBiz){
			console.log(savedBiz);
			res.json(savedBiz)
		});
	});
});

app.post('/api/business/:id/comments', function(req, res){
  var bizId = {business_id:req.params.id};

  Business.findOne(bizId, function(err, test) {
    var newComment = new Comment({
      createdAt: req.body.createdAt,
      comments: req.body.comments,
      author: req.body.author
    });
   
    newComment.save();    
    test.comments.push(newComment);
    
    test.save(function(err, succ){
      console.log(err);
      console.log(succ);
    });
    res.json(newComment);
    console.log(test);
  });  
});

app.put('/api/:userid/favorites', function (req, res){
  var userid = {_id:req.params.userid};
  var businessid = {business_id:req.body.id};

  Business.findOne(businessid, function(err, found_business) {
    if (found_business) {
      User.findOne(userid, function(err, found_user) {
        console.log(found_user);
        found_user.favorites.push(found_business);
        found_user.save();
        res.json(found_business);
      });
    } else {
      var newBusiness= new Business({
        business_id: req.body.id
      });
      newBusiness.save(function(err, saved){
        User.findOne(userid, function(err, found_user) {
          found_user.favorites.push(newBusiness);
          found_user.save();
          res.json(newBusiness);
        });
      });
    };
  });
});

app.delete('/api/:userid/favorites', function(req, res) {
  var userid = {_id:req.params.userid};
  var businessid = {business_id: req.body.id};

  User.findOne(userid, function(err, found_user) {
    var temp = _.findWhere(found_user.favorites, businessid);
    var index = found_user.favorites.indexOf(temp);
    found_user.favorites.splice(index, 1);
    found_user.save();
    res.json(found_user);
  });
});

io.sockets.on("connection", function(socket){
  // console.log("connected");
  socket.on("send:comment", function(data){
    io.sockets.emit("send:comment", data);
  });
  socket.on("send:time", function(data){
    io.sockets.emit("send:time", data);
  });
});

// listen on port 3000
http.listen(process.env.PORT || 3000, function () {
  console.log('server started on localhost 3000');
});

// set location for static files
// app.use(express.static(__dirname + '/www'));

// load public/index.html file (angular app)
// app.get('*', function (req, res) {
//   res.sendFile(__dirname + '/index.html');
// });
