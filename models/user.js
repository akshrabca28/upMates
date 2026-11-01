const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose').default;

const userSchema = new Schema({
  email:{
    type:String,
    required:true,
    unique:true,
    trim:true,
  },

  bio:{
    type:String,
    default:""
  },

  profileImage:{
    type:String,
    default:""
  },

  skillsToLearn:{
    type:[String],
    default:[]
  },

   skillsToTeach:{
    type:[String],
    default:[]
  },

})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema);