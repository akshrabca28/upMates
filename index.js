 const dns = require("dns");
 dns.setServers(["8.8.8.8", "8.8.4.4"]);

if(process.env.NODE_ENV != "production"){
require('dotenv').config();
}

const express  = require("express");
const app = express();
const passport = require("passport");
const LocalStrategy = require("passport-local")
const User = require('./models/user.js');
 const session = require('express-session');
//  const MongoStore = require('connect-mongo');
 const {MongoStore} = require("connect-mongo");
 const passportLocalMongoose = require('passport-local-mongoose').default;
const methodOverride = require('method-override')
const ejsMate = require("ejs-mate"); 
const {isLoggedIn} = require("./middleware.js");
const Skill = require("./models/skills.js");
const flash = require("connect-flash");
const Request = require("./models/request.js") ;


const path = require("path");
app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static("public"));
const mongoose = require("mongoose");
// const MONGO_URL = 'mongodb://127.0.0.1:27017/skillswap';

const dbURL = process.env.ATLASDB_URL

main().then(()=>{
  console.log("connected to database");
}).catch((err)=>{
  console.log(err);
})

async function main(){
 await mongoose.connect(dbURL);
}
const store = MongoStore.create({
  mongoUrl:dbURL,
   crypto:{
    secret: process.env.SECRET,
  },
   touchAfter: 24 * 3600 ,
   
});

store.on("error",()=>{
  console.log("ERROR in MONGO SESSION STORE",err);
});
const sessionOptions = {
    store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie:{
    expires:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly:true,
  }
}

app.use(session(sessionOptions));
app.use(flash());
// app.use(({ secret: 'skillswap|upMates', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
 res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.req = req;
  if(res.locals.currUser == "undefined" ||null){
    console.log("errror");
  }
  next();
})

app.get("/",(req,res)=>{
  // res.send("skill swap");
  res.render("../views/users/home.ejs");
});
//signup
app.get("/signup",(req,res)=>{
  res.render("../views/users/signup.ejs");
});

app.post("/signup",async(req,res)=>{
  try{
  let{username,email,password} = req.body;
 let newUser =  new User({email,username});
 let registerUser = await User.register(newUser,password);
 console.log(registerUser);
 req.flash("success","you logged in successfully!");
 res.redirect("/");
  }catch(err){
    console.log(err);
    res.send(err);
  }
});

// login;
app.get("/login",(req,res)=>{
  res.render("../views/users/login.ejs");
});

app.post("/login",passport.authenticate('local',{ failureRedirect: '/login' ,}),async(req,res)=>{
  req.flash("success","you logged in successfully!");
  res.redirect("/");
});

//logout 

app.get("/logout",(req,res)=>{
  req.logout((err)=>{
    if(err){
      console.log(err);
    }
    req.flash("success","you are logged out successfully!");
     res.redirect("/");
  })
});


// skills

app.get("/skills",isLoggedIn,async(req,res)=>{
 try{
  const skills = await Skill.find({user:req.user._id});
  console.log(skills);
  res.render("../views/users/myskills.ejs",{skills});
 }
 catch(err){
  console.log(err);
  res.send("error feching skill");
 }
});


app.post("/skills",isLoggedIn,async(req,res)=>{
  console.log("done")
  console.log(req.user);
  try{
 const {skillName,category,type,description} = req.body;
 const newSkill = new Skill({
  skillName :skillName,
  category:category,
  description:description,
  user:req.user._id,
  type:type,
 });
 const addskill =  await newSkill.save();

 if (type === "teach") {
    await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { skillsToTeach: skillName } }
    );
}

if (type === "learn") {
    await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { skillsToLearn: skillName } }
    );
}
 console.log(addskill);
 req.flash("success","your skill added successfully!");
 res.redirect("/skills");
  }
  catch (err) {
        console.log(err);
        res.status(500).send("Error saving skill");
    }
});
// app.all("/{*splat}",(req,res,next)=>{
//   next(new ExpressError(404,"Page Not Found!"));
// });



// delete skill

app.delete("/skills/:id/delete",isLoggedIn,async(req,res)=>{
  try{
const {id} = req.params;
let del_skill = await Skill.findOneAndDelete({
  _id:id,
  user:req.user._id
});
console.log(del_skill);
req.flash("success","skill deleted!");
res.redirect("/skills");
  }catch(err){
    res.send("error on deleting");
  }
});

// edit skill

  app.get("/skills/:id/edit", isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const skill = await Skill.findOne({
        _id: id,
        user: req.user._id
    });

    if (!skill) {
        return res.send("Skill not found");
    }
req.flash("success","skill Updated!");
    res.render("../views/users/editskill.ejs", { skill });
});


// app.put("/skills/:id",async(req,res)=>{
//   let {id} = req.params;
//   let upddateskill = await Skill.findByIdAndUpdate(id);
//  console.log(upddateskill);
//  req.flash("success","listing Updated!");
//   res.redirect("/skills");
// })
app.put("/skills/:id", isLoggedIn, async (req, res) => {

    let { id } = req.params;

    console.log(req.body);

    let updateskill = await Skill.findByIdAndUpdate(
        id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    console.log(updateskill);

    req.flash("success", "Skill Updated!");
    res.redirect("/skills");

});

// explore

app.get("/explore", isLoggedIn, async (req, res) => {
    try {
        const skills = await User.find();
   console.log(skills);

   const filteredSkills = skills.filter(s =>
    s.skillsToTeach.some(skill => skill.trim() !== "") ||
    s.skillsToLearn.some(skill => skill.trim() !== "")
);    
       
        res.render("users/explore", { skills:filteredSkills ,name:"",skill:"",category:""});

    } catch (err) {
        console.log(err);
        res.send("Error fetching skills");
    }
});


// profile people

app.get("/profile/:id", isLoggedIn, async (req, res) => {
    try {

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.send("User not found");
        }

        const skills = await Skill.find({
            user: user._id
        });

        const teachSkills = skills.filter(
            skill => skill.type === "teach"
        );

        const learnSkills = skills.filter(
            skill => skill.type === "learn"
        );

        res.render("users/profile", {
            user,
            teachSkills,
            learnSkills
        });

    } catch (err) {
        console.log(err);
        res.send("Error loading profile");
    }
});



// request send
app.post("/request/:id", isLoggedIn, async (req, res) => {

    try {

        const senderId = req.user._id;

        const receiverId = req.params.id;

        const newRequest = new Request({
            sender: senderId,
            receiver: receiverId
        });

        await newRequest.save();
    req.flash("success", "request sent!");

        res.redirect("/explore");

    } catch (err) {
        console.log(err);
        res.send("Error sending request");
    }

});



app.get("/explore/search", isLoggedIn, async (req, res) => {
    try {
        const skill = req.query.skill || "";

        let users = [];

        if (skill.trim() !== "") {

            const matchedSkills = await Skill.find({
                skillName: {
                    $regex: skill.trim(),
                    $options: "i"
                }
            });

            const userIds = [
                ...new Set(matchedSkills.map(s => s.user.toString()))
            ];

            users = await User.find({
                _id: {
                    $in: userIds,
                    $ne: req.user._id
                }
            });
        }

        res.render("users/explore", {
            skills: users,
            skill:""
        });

    } catch (err) {
        console.log(err);
        res.send("Search Error");
    }
});


// My Requests Page

app.get("/myRequest", isLoggedIn, async (req, res) => {
    try {

        // Received Requests
        const receivedRequests = await Request.find({
            receiver: req.user._id
        }).populate("sender");

        // Sent Requests
        const sentRequests = await Request.find({
            sender: req.user._id
        }).populate("receiver");

        res.render("users/myRequest", {
            receivedRequests,
            sentRequests
        });

    } catch (err) {
        console.log(err);
        res.send("Error loading requests");
    }
});

// accept request

app.post("/request/accept/:id", isLoggedIn, async (req, res) => {
    try {

        await Request.findOneAndUpdate(
            {
                _id: req.params.id,
                receiver: req.user._id
            },
            {
                status: "Accepted"
            }
        );

        res.redirect("/myRequest");

    } catch (err) {
        console.log(err);
        res.send("Error accepting request");
    }
});

// reject request

app.post("/request/reject/:id", isLoggedIn, async (req, res) => {
    try {

        await Request.findOneAndUpdate(
            {
                _id: req.params.id,
                receiver: req.user._id
            },
            {
                status: "Rejected"
            }
        );

        res.redirect("/myRequest");

    } catch (err) {
        console.log(err);
        res.send("Error rejecting request");
    }
});

// user profile/ account
app.get("/myProfile", isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const skills = await Skill.find({
            user: req.user._id
        });

        res.render("users/myProfile", { user, skills });

    } catch (err) {
        console.log(err);
        res.send("Error loading profile");
    }
});


// edit user profile -get

app.get("/editProfile", isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);

    res.render("users/editProfile", { user });
});
// edit user profile -post

app.post("/editProfile", isLoggedIn, async (req, res) => {
    try {
        const { username, email, bio } = req.body;

        await User.findByIdAndUpdate(req.user._id, {
            username,
            email,
            bio
        });

        res.redirect("/myProfile");

    } catch (err) {
        console.log(err);
        res.send("Error updating profile");
    }
});

app.all("/{*splat}",(req,res,next)=>{
  next(new ExpressError(404,"Page Not Found!"));
});

app.use((err,req,res,next)=>{
 let {status=500,message = "something went wrong"} = err;
 res.send(err);
//   res.render("./listings/Error.ejs",{err});
});



app.listen(2000,()=>{
  console.log("server is listening :2000");
})

