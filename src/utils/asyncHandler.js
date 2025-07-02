// The asyncHandler is used to wrap asynchronous route handlers or middleware so you don't have to manually write try-catch in every route.
// asyncHandler gets a express route handlers fn. and it takes that fn. wraps it with a promise

const asyncHandler = (reqestHandler) => {
    return (req, res, next) => {
        Promise.resolve(reqestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler };



















// const asyncHandler = () => { }
// const asyncHandler = (fn) => () => { }
// const asyncHandler = (fn) => async () => { }


// return is not used when we don't put the curly braces for the outer arrow fn.
// const asyncHandler1 = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// return is used when we put the curly braces for the outer arrow fn.
// const asyncHandler2 = (fn) => {
//     return async (req, res, next) => {
//         try {
//             await fn(req, res, next)
//         } catch (error) {
//             res.status(error.code || 500).json({
//                 success: false,
//                 message: error.message
//             })
//         }
//     }
// }