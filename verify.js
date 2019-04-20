const jwt = require("jsonwebtoken")
const secret = require("./secrets")
module.exports = (req) => {

    let token;
    try {
        token = jwt.verify(req.request.get("Authorization"), secret);
    } catch (e) {
        return null;
    }
    // console.log(token.claims)
    return token;
}

