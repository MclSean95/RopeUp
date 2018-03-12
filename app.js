var http = require('http');
var path = require('path');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = "mongodb://Sean:passW0rd@ds235768.mlab.com:35768/ropeup";

var app = express();

app.set('views', path.resolve(__dirname, 'views'));
app.set("view engine", "ejs");

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

app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

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
			
			var dbObj = db.db("ropeup");
			
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
		response.redirect("/sign-up");
	}
}

app.get("/sign-in", function(req, res){
	res.render("sign-in");
});

app.get("/sign-up", function(req, res){
	res.render("sign-up");
});

app.get("/profilePage"), function(req, res){
    res.render("profilePage");
}

app.get("/logout", function(request, response){
	request.logout();
	response.redirect("/sign-in");
});
	
app.get("/", ensureAuthenticated, function(req, res){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("ropeup");
		
		dbObj.collection("gyms").find().toArray(function(err, results){
			db.close();
			res.render("index",{gym:results});
		});
	});
	
});

app.get("/new-entry", ensureAuthenticated, function(req, res){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("ropeup");
		
		dbObj.collection("gyms").find().toArray(function(err, results){
			console.log("Site served");
			db.close();
			res.render("new-entry",{gyms:results});
		});
	});
});

app.get("/profilePage", ensureAuthenticated, function(request, response){
    
    MongoClient.connect(url, function(err, db){
		if(err) throw err;
		 
		var dbObj = db.db("ropeup");
        

		
		dbObj.collection("userGyms").find({username:request.user.username}).toArray(function(err, results){
			db.close();
			response.render("profilePage",{gyms:results, name:request.user.username});
		});
        
	});
		
});

app.get("/matches", ensureAuthenticated, function(request, response){
    var searchParams;
    
    MongoClient.connect(url, function(err, db){
		if(err) throw err;

		var dbObj = db.db("ropeup");
        
        var params = dbObj.collection("userGyms").findOne({username:request.user.username}).then(function(params){
            console.log(params);
        
		dbObj.collection("userGyms").find({$and: [{username:{$ne: request.user.username}}, {name: params.name},
                                            {$or:[{$and:[{monday: params.monday}, {monday: "M"}]},
                                                 {$and:[{tuesday: params.tuesday}, {tuesday: "T"}]},
                                                 {$and:[{wednesday: params.wednesday}, {wednesday: "W"}]},
                                                 {$and:[{thursday: params.thursday}, {thursday: "TH"}]},
                                                 {$and:[{friday: params.friday}, {friday: "F"}]},
                                                 {$and:[{saturday: params.saturday}, {saturday: "SA"}]},
                                                 {$and:[{sunday: params.sunday}, {sunday: "SU"}]}]},
                                            {$or:[{$and:[{sTime:{$gte: params.sTime}}, {sTime:{$lt: params.eTime}}]},
                                                 {$and:[{eTime:{$gte: params.sTime}}, {eTime:{$lt: params.eTime}}]},
                                                 {$and:[{sTime:{$lte: params.sTime}}, {eTime:{$gte: params.eTime}}]}]}
                                                 ]}).toArray(function(err, results){
			db.close();
			response.render("matches",{gyms:results});

		  });        
        });     
	});
});

app.post("/sign-up", function(request, response){
	console.log(request.body);
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
        
		
		var dbObj = db.db("ropeup");
		
		var user = {
                "username": request.body.username,
                "password": request.body.password,
                "passwordVer": request.body.passwordVer,
                "email": request.body.email,
                "fName": request.body.f_name,
                "lName": request.body.l_name,
                "sex": request.body.Sex,
                "birthday": request.body.birthday
		};
        
        //Make the entire object a string then  
        //parse the string so you can access individual parts of the object.
        var obj = JSON.parse(JSON.stringify(user));

        //Check that what the user entered as a password re-entry mathches the origional password.
        if(obj.password == obj.passwordVer)
        { 
            dbObj.collection("users").insert(user, function(err, results){
			 if(err) throw err;
                
			 request.login(request.body, function(){
			 response.redirect("/profilePage");
                console.log("Data Saved");
                });
		      });
        }
        else
        {
            response.redirect("/sign-up");
        }
            
	});
});

app.post("/new-entry", function(request, response){
   MongoClient.connect(url, function(err, db){
       if(err) throw err;
       
       dbObj = db.db("ropeup");
       
       var gymData = {
           "username": request.user.username,
           "name" : request.body.Name,
           "monday" : request.body.monday,
           "tuesday" : request.body.tuesday,
           "wednesday" : request.body.wednesday,
           "thursday" : request.body.thursday,
           "friday" : request.body.friday,
           "saturday": request.body.saturday,
           "sunday": request.body.sunday,
           "sTime" : request.body.start,
           "eTime" : request.body.end
       };
             
        var obj = JSON.parse(JSON.stringify(gymData));
 
            //If atleast one day has been selected then send the data to the database.
            if(obj.monday != "null" || obj.tuesday != "null" || obj.wednesday != "null" ||
               obj.thursday != "null" || obj.friday != "null" || obj.saturday != "null" || obj.sunday != "null")
            {
                dbObj.collection("userGyms").insert(gymData, function(err, results){
                    if(err) throw err;
           
                    db.close();
                    response.redirect("profilePage");
                });
            }
   });
});

app.post("/sign-in", passport.authenticate("local", {
	failureRedirect:"/sign-in",
	}), function(request, response){
		response.redirect("profilePage");
	});

app.use(function(req, res){
	res.status(404).render("404");
});

http.createServer(app).listen(3000, function(){
	console.log("server started on port 3000");
});