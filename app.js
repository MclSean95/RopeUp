var http = require('http');
var path = require('path');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://Sean:1234@ds011745.mlab.com:11745/gameslib";

var app = express();

app.set('views', path.resolve(__dirname, 'views'));
app.set("view engine", "ejs");

//var entries = [];

//app.locals.entries = entries;

app.use(logger("dev"));

app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
	secret: "secretSession",
	resave: true,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
	done(null, user);
});

passport.deserializeUser(function(user, done){
	done(null, user);
});

LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
	usernameField:'',
	passwordField:''
	},
	function(username, password, done){
		MongoClient.connect(url, function(err, db){
			if(err) throw err;
			
			var dbObj = db.db("gameslib");
			
			dbObj.collection("users").findOne({username:username}, function(err, results){
				if(results.password === password){
					var user = results;
					done(null, user);
				}
				else{
					done(null, false, {message: "Bad Password"});
				}
			});
		});	
	}));

function ensureAuthenticated(request, response, next){
	if(request.isAuthenticated()){
		next();
	}
	else{
		response.redirect("/sign-in");
	}
}
	
app.get("/logout", function(request, response){
	request.logout();
	response.redirect("/sign-in");
});
	
app.get("/", ensureAuthenticated, function(req, res){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("gameslib");
		
		dbObj.collection("games").find().toArray(function(err, results){
			console.log("Site served");
			db.close();
			res.render("index",{games:results});
		});
	});
	
});

app.get("/new-entry", ensureAuthenticated, function(req, res){
	res.render("new-entry");
});

app.get("/sign-in", function(req, res){
	res.render("sign-in");
});

app.post("/new-entry", function(req, response){
	if(!req.body.title || !req.body.body){
		response.status(400).send("Entries must have some text!");
		return;
	}
	
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("gameslib");
		
		dbObj.collection("games").save(req.body, function(err, result){
			console.log("Data saved");
			db.close();
			response.redirect("/");
		});
	});
});

app.post("/sign-up", function(request, response){
	console.log(request.body);
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("gameslib");
		
		var user = {
			username: request.body.username,
			password: request.body.password
		};
		
		dbObj.collection("users").insert(user, function(err, results){
			if(err) throw err;
			
			request.login(request.body, function(){
			response.redirect("/profile");
			});
		});
	});
});

app.post("/sign-in", passport.authenticate("local", {
	failureRedirect:"/sign-in",
	}), function(request, response){
		response.redirect("/");
	});


app.get("/profile", function(request, response){
		response.json(request.user);
});

app.use(function(req, res){
	res.status(404).render("404");
});

http.createServer(app).listen(8081, function(){
	console.log("Game libray server started on port 3000");
});