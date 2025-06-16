class ApiResponse {
    constructor(statusCode, data, message = "Suucess") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}