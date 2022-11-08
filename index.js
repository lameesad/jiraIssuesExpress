let express = require('express');
let app = express();
let cors = require('cors');

let router = express.Router();
// Configure middleware to support JSON data parsing in request object
app.use(express.json());

// Configure CORS

app.use(cors());
// Create GET to return a list of all pies
router.get('/', function (req, res, next) {
    res.send("TEST")

});

app.use('/api/', router);

var server = app.listen(3000, function () {
    console.log("Node server is running on http://localhost:3000..");
})