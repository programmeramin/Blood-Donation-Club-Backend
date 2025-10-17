import  mongoose  from "mongoose";

const OTP_TTL = 5 * 60; // 5 মিনিট = 300 সেকেন্ড

// create user schema
const UserSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, 
    },

    email: {
      type: String,
      sparse: true, // null / missing value skip করবে
      trim: true,
      required: function () {
        return !this.phone; // phone না থাকলে email লাগবে
      },
    },

    phone: {
      type: String,
      sparse: true, // null / missing value skip করবে
      trim: true,
      required: function () {
        return !this.email; // email না থাকলে phone লাগবে
      },
    },

    password: {
      type: String,
      default : null,
      trim: true,
    },

    photo: {
      type: String,
      default: null,
      trim: true,
    },

    district : {
      type: String,
      default: null,
      trim: true,
    },

    subDistrict : {
      type : String,
      default : null,
      trim : true,
    },

    profession: {
      type: String,
      default: null,
      trim: true,
    },

    bio: {
      type: String,
      default: null,
      trim: true,
    },

    dateOfBirth: {
      type: String,
      default: null,
      trim: true,
    },

    gallery: {
      type: [],
      default: null,
    },

    bloodGroup: {
      type: [String],
      default: null,
      trim: true,
    },

    lastDonation: {
      type: Date,
      default: null,
      trim: true,
    },

    accessToken : {
      type: String,
      default: null,
      select : false,
      trim: true,
    },

    otpExpiresAt: { 
      type: Date
    },

    role: {
      type: String,
      default: "patient",
      enum: ["patient", "donor", "admin"],
    },

    isActivate: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: Boolean,
      default: false,
    },

    trash: {
      type: Boolean,
      default: false,
    },

    // resetPasswordToken : String,
    // resetPasswordExpiresAt : Date,
    // verificationToken : String,
    // verificationTokenExpiresAt : Date,

  },
  { timestamps: true }
);

// ✅ TTL index define (export এর আগে)
UserSchema.index(
  { otpExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      isVerified: false,
      otpExpiresAt: { $exists: true },
    },
  }
);


export default mongoose.model("User", UserSchema);


