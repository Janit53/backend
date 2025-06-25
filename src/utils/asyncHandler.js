// The asyncHandler is used to wrap asynchronous route handlers or middleware so you don't have to manually write try-catch in every route.

const asyncHandler = (reqestHandler) => {
    return (req, res, next) => {
        Promise.resolve(reqestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler };























// const asyncHandler = () => { }
// const asyncHandler = (fn) => () => { }
// const asyncHandler = (fn) => async () => { }



// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// } 