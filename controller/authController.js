import User from "../model/userModel.js";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createOTP, isEmail, isMobile } from "../helper/helper.js";
import { ForgotPasswordOtp, resetPassSucces, sendOtpMail } from "../mails/VerifyEmailOtp.js";
import axios from "axios";

/**
 * description User Register
 * method POST
 * access public
 * route /api/v1/auth/register
 *
 */

export const registerUser = asyncHandler(async (req, res) => {
  const { name, auth, password, conPass, role } = req.body;

  // Validation
  if (!name?.trim() || !auth?.trim() || !password?.trim() || !conPass?.trim()) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== conPass) {
    return res.status(400).json({ message: "Password didn't match" });
  }
  const otp = createOTP();
  let authEmail = null;
  let authPhone = null;

  if (isEmail(auth)) {
    authEmail = auth.toLowerCase();
    const checkEmail = await User.findOne({ email: authEmail });
    if (checkEmail) return res.status(400).json({ message: "Email already exists" });
  } else if (isMobile(auth)) {
    authPhone = auth;
    const checkMobile = await User.findOne({ phone: authPhone });
    if (checkMobile) return res.status(400).json({ message: "Mobile already exists" });
  } else {
    return res.status(400).json({ message: "You must use a valid email or phone number" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = await User.create({
    name,
    email: authEmail,
    phone: authPhone,
    password: hashedPassword,
    accessToken: otp,
    otpExpiresAt,
    role,
  });

  const activationToken = jwt.sign(
    { userId: user._id },
    process.env.ACCOUNT_ACTIVATION_SECRET,
    { expiresIn: "1y" }
  );

  res.cookie("activationToken", activationToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  // Send OTP
  if (authEmail) {
    try {
      await sendOtpMail(authEmail, otp); // Hosted-friendly Brevo API function
    } catch (err) {
      console.error("❌ Email failed:", err.message);
    }
  }

  if (authPhone) {
    const message = `Hi ${name}, Your OTP code: ${otp}. OTP is valid for 5 minutes.`;
    await axios.get("https://bulksmsbd.net/api/smsapi", {
      params: {
        api_key: "9AmVeMs2GnbB1IS5H7FW",
        type: "text",
        number: authPhone,
        senderid: "8809617612994",
        message,
      },
    });
  }

  res.status(201).json({ user, message: "User created successfully" });
});

/**
 * @description User otp verification
 * @method POST
 * @access Public
 * @route /api/v1/auth/register
 */

export const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) return res.status(400).json({ message: "OTP is required" });

  // 1️⃣ Read activationToken from HTTP-only cookie
  const activationToken = req.cookies.activationToken;

  if (!activationToken)
    return res.status(401).json({ message: "Activation token missing" });

  // 2️⃣ Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(
      activationToken,
      process.env.ACCOUNT_ACTIVATION_SECRET
    );
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired activation token" });
  }

   
  // 3️⃣ Get user from decoded token
  const user = await User.findById(decoded.userId).select("+accessToken");
  if (!user) return res.status(404).json({ message: "User not found" });

  // 4️⃣ Check OTP validity
  if (user.isVerified)
    return res.status(400).json({ message: "User already verified" });
  if (user.accessToken !== otp)
    return res.status(400).json({ message: "Invalid OTP" });
  if (user.otpExpiresAt < new Date()) {
    await User.findByIdAndDelete(user._id); // ❌ Delete unverified user otp time expired
    res.clearCookie("activationToken"); // clear token also
    return res
      .status(400)
      .json({ message: "OTP expired. Please register again." });
  }

  // 5️⃣ OTP valid → activate user
  user.isVerified = true;
  user.accessToken = null;
  user.otpExpiresAt = null;
  await user.save();     

  // 6️⃣ Clear activationToken cookie
  res.clearCookie("activationToken", activationToken);

  res.status(200).json({ message: "Account verified successfully" });
});

/**
 * @description login user
 * @method POST
 * @access public
 * @route api/v1/auth/login
 */

export const login = asyncHandler(async (req, res) => {
  const { auth, password } = req.body;

  // all field validation
  if (!auth || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let loginUser = null;

  if (isEmail(auth)) {
    loginUser = await User.findOne({ email: auth });

    if (!loginUser) {
      return res.status(400).json({ message: "Email user not found" });
    }
  } else if (isMobile(auth)) {
    loginUser = await User.findOne({ phone: auth });

    if (!loginUser) {
      return res.status(400).json({ message: "Mobile user not found" });
    }
  } else {
    return res.status(400).json({ message: "Email or Mobile user not found" });
  }

  // password check
  const validPassword = await bcrypt.compare(password, loginUser.password);

  if (!validPassword) {
    return res.status(400).json({ message: "Wrong password" });
  }

  const loginUserToken = jwt.sign(
    { auth: loginUser.auth },
    process.env.USER_LOGN_SECRET,
    { expiresIn: "365d" }
  );

  res.cookie("loginUserToken", loginUserToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "development" ? false : true,
    sameSite: "strict",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });

  res.status(200).json({ message: "User login successfull" });
});

/**
 * @description logout user
 * @method get
 * @access public
 * @route api/v1/auth/logout
 */
18723
export const logOut = asyncHandler(async (req, res) => {
  res.clearCookie("loginUserToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "development" ? false : true,
    sameSite: "strict",
    path: "/", // অবশ্যই include করো
  });

  res.status(200).json({ message: "Logout successful ✅" });
});

/**
 * @description getLoggedUser
 * @method get
 * @access logged in user
 * @route api/v1/auth/token-verify
 */

export const getLoggedInUser = asyncHandler(async (req, res) => {
  if (!req.me) {
    return res.status(404).json({ message: "Logged In User not found" });
  }

  res.status(200).json({
    auth: req.me,
    message: "User fetched successfully",
  });
});

/**
 * @description change password
 * @method POST
 * @access  public
 * @route api/v1/auth/change-password
 */
 
export const changepassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, conPassword } = req.body;

  // all fields check
  if (!oldPassword || !newPassword || !conPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // check newpasword equal conpassword
  if (newPassword !== conPassword) {
    res.status(400).json({ message: "Password didn't match" });
  }

  // ensure req.me is not null
  if(!req.me){
    return res.status(401).json({message : "Unauthorized"})
  }

  // get login user data
  const userData = await User.findById(req.me._id);

  if(!userData){
    return res.status(404).json({message : "User not found"})
  }

  // check old Password
  const passwordCheck = await bcrypt.compare(oldPassword, userData.password);

  if (!passwordCheck) {
    return res.status(400).json({ message: "Wrong old password" });
  }

  // hashPass
  const hassPassword = await bcrypt.hash(newPassword, 10);

  // update old password
  userData.password = hassPassword;
  userData.save();
  return res
    .status(200)
    .json({ user: userData, message: "Password Change Successfull" });
});

/**
 * @description forgot password
 * @method POST
 * @access public
 * @route api/v1/auth/forgot-password
 */

export const forgotpassword = asyncHandler(async (req, res) => {
  const { auth } = req.body;

  if (!auth) {
    return res.status(400).json({ message: "Auth fields are required" });
  }

  // reset otp
  const otp = createOTP();

  let user = null;
  if (isEmail(auth)) {
    user = await User.findOne({ email: auth });

    if (!user) {
      return res.status(400).json({ message: "Email user not found" });
    }
  } else if (isMobile(auth)) {
    user = await User.findOne({ phone: auth });

    if (!user) {
      return res.status(400).json({ message: "Mobile user not found" });
    }
  } else {
    return res.status({ message: "User not found" });
  }

  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  user.password = null;
  user.otpExpiresAt = otpExpiresAt;
  user.accessToken = otp;
  await user.save();

  if (isEmail(auth)) {
    await ForgotPasswordOtp(auth, { code: otp, link: "" });
  } else if (isMobile) {
    const { name, auth } = req.body;
    const message = `Hi ${user.name}, Your forgot password OTP code: ${otp}. OTP is valid for 5 minutes.`;
    await axios.get(`https://bulksmsbd.net/api/smsapi`, {
      params: {
        api_key: "9AmVeMs2GnbB1IS5H7FW",
        type: "text",
        number: auth,
        senderid: "8809617612994",
        message,
      },
    });
  }

  res.status(200).json({ user });
});

/**
 * @description reset password
 * @access public
 * @method POST
 * @route api/v1/auth/reset-password
 */

export const resetpassword = asyncHandler(async (req, res) => {
  const { auth, otp, password } = req.body;

  // all fields check
  if (!auth || !otp || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let user = null;
  if (isEmail(auth)) {
    user = await User.findOne({ email: auth });

    if (!user) {
      return res.status(400).json({ message: "Email user not found" });
    }
  } else if (isMobile(auth)) {
    user = await User.findOne({ phone: auth });

    if (!user) {
      return res.status(400).json({ message: "Mobile user not found" });
    }
  } else {
    return res.status({ message: "User not found" });
  }


  // check otp
  if (user.accessToken !== otp) {
    return res.status(400).json({ message: "Wrong otp" });
  }
  
    // check otp time expired 
  if(user.otpExpiresAt < new Date()){
    user.accessToken = null;
    user.otpExpiresAt = null;
     await user.save();
    return res.status(400).json({message : "Otp time expired again forgot password"});
  }

  // hass password
  const hassPassword = await bcrypt.hash(password, 10);
  
  user.password = hassPassword;
  user.accessToken = null;
  user.otpExpiresAt = null;
  await user.save();

  if(isEmail(auth)){
    await resetPassSucces(auth)
  }

  res.status(201).json({user, message : "Password reset successfull"});
});
