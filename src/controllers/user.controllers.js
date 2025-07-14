import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToke();
        const refreshToken = user.generateRefreshToke();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }

}


const registerUser = asyncHandler(async (req, res) => {
    // 1. get user details from frontend
    // 2. data validation - eg. not empty
    // 3. check if user already exists: using username, email
    // 4. check for images, check for avatar
    // 5. upload them to cloudinary, avatar
    // 6. create user object - create entry in db
    // 7. remove password and refrrsh token field from response
    // 8. check for user creation
    // 9. return res else send error

    // 1.
    const { username, email, fullName, password } = req.body;
    // console.log('request object', req.body);

    // 2.
    // if (fullName === "") {
    //     throw new ApiError(400, "fullname is required")                // we arite this code for every field
    // }

    if (
        [fullName, email, username, password].some((field) => { return field?.trim() === "" })   // returns ture if any one of fields is empty
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // 3.
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists")
    }

    // 4.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // console.log(req.files);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // 5.
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // 6.
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // 7.
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // 8.
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // 9.
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})


const loginUser = asyncHandler(async (req, res, next) => {
    // 1. bring data from req.body
    // 2. check username or email
    // 3. find the user
    // 4. password check
    // 5. access and refresh token generate
    // 6. send access and refresh token secure cookies 

    // 1.
    const { username, email, password } = req.body;

    // 2.
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }

    // 3.
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // 4.
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password")
    }

    // 5.
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // 6.
    // here either uh make a server call to get the updated user (every server calls takes a time or since uh have the refresh token and access token update the pre existing "user")
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
        )

})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newrefreshToken)
            .json(
                new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed")
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }




})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


// update controllers for user data, but not for image or any file updates, though both could be updated in one controller
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { fullName, email: email }, { new: true }).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {

    // fetching user details from mongodb
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(500, "error occured while fetching you information")
    }

    // getting new Avatar local path
    const newAvatarLocalPath = req.file?.path;
    if (!newAvatarLocalPath) {
        throw new ApiError(400, "Provide image to update your avatar")
    }

    // uploading the new avatar to cloudinary
    const newAvatar = await uploadOnCloudinary(newAvatarLocalPath)
    if (!newAvatar.url) {
        throw new ApiError(400, "Error while upoading Avatar")
    }

    // deleting the old avatar from cloudinary
    // const oldAvatarUrl = user.avatar.replace(".jpg", "");
    // const oldAvatarDestroyed = await cloudinary.uploader.destroy(oldAvatarUrl, { resource_type: "image" })
    // if (!oldAvatarDestroyed) {
    //     throw new ApiError(500, "Something went wrong while updating your avatar")
    // }

    // changing the URL from old to new of a user
    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: { avatar: newAvatar.url } }, { new: true }).select("-password -refreshToken")
    if (!updatedUser) {
        throw new ApiError(500, "Internal server, couldnt update avatar")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar image updated successfully"))
})


const updateUserCoverImage = asyncHandler(async (req, res) => {

    // fetching user details from mongodb
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(500, "error occured while fetching you information")
    }

    // getting new coverimage local path
    const newCoverImageLocalPath = req.file?.path;
    if (!newCoverImageLocalPath) {
        throw new ApiError(400, "Provide image to update your cover image")
    }

    // uploading the new coverimage to cloudinary
    const newCoverImage = await uploadOnCloudinary(newCoverImageLocalPath)
    if (!newCoverImage.url) {
        throw new ApiError(400, "Error while upoading Cover Image")
    }

    // deleting the old coverimage from cloudinary
    // const oldCoverImageUrl = user.coverImage.replace(".jpg", "");
    // const oldCoverImageDestroyed = await cloudinary.uploader.destroy(oldCoverImageUrl, { resource_type: "image" })
    // if (!oldCoverImageDestroyed) {
    //     throw new ApiError(500, "Something went wrong while updating your cover image")
    // }

    // changing the URL from old to new of a user cover image
    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: { coverImage: newCoverImage.url } }, { new: true }).select("-password -refreshToken")
    if (!updatedUser) {
        throw new ApiError(500, "Internal server, couldnt update avatar")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "user channel fetched successfullys"))

})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile };



// const oldAvatarUrl = await User.findById(req.user?._id).avatar.replace(".jpg", "")