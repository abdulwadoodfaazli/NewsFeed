var express = require("express");
var cookieParser = require("cookie-parser");

var app = express();

app.use(express.json());

app.use(cookieParser());

var monk = require("monk");
const { text } = require("body-parser");
const { json } = require("express/lib/response");
const res = require("express/lib/response");
var db = monk("127.0.0.1:27017/assignment1");

// Getting first 10 words of content

function first10words(content) {
	var text = "";
	var i = 0;
	var j = 0;
	while (i < 10 && j < content.length) {
		if (content[j] == " ") {
			i++;
		};
		text += content[j];
		j++;
	};
	return (text + "...");
}

// Creating the json to be sent to the client-side

function renderJSON(docs, pageIndex, loginStatus) {
	var last_doc = (pageIndex * 5) - 1;
	var first_doc = last_doc - 4;
	var json = [{ "entries": docs.length }, { "login_status": loginStatus }];
	for (var i = first_doc; i <= last_doc; i++) {
		if (i < docs.length) {
			var news = docs[i];
			var id = news._id;
			var headline = news.headline;
			var time = new Date(news.time).toLocaleString();
			var simplified_content = first10words(news.content);
			json.push({ "id": id, "headline": headline, "time": time, "content": simplified_content });
		};
	};
	return json;
};

// Function for sorting the comments by their posting time

function sorting(item1, item2) {
	if (item1.time > item2.time) {
		return -1;
	}
	if (item1.time < item2.time) {
		return 1;
	}
	else {
		return 0;
	}
};

app.use(express.static("public"), function (req, res, next) {
	req.db = db;
	next();
});

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/" + "newsfeed.html");
});

app.get("/retrievenewslist", (req, res) => {
	searchstring = req.query.searchstring;
	console.log(searchstring);
	pageIndex = req.query.pageIndex;
	var db = req.db;
	var col = db.get("newsList");

	// Checking for cookie

	if (req.cookies.userID) {
		var loginStatus = 1;
	}
	else {
		var loginStatus = 0;
	};

	// Finding the relevant documents

	col.aggregate([
		{
			$match:
			{
				"headline": {$regex: searchstring, $options:"i"} // $options:i added for case insensitive search
			}
		},
		{
			$sort:
				{ time: -1 }
		}
	]).then((docs) => {
		var result = renderJSON(docs, pageIndex, loginStatus);
		console.log(result);
		res.send(result);
	});
});

app.get("/displayNewsEntry", (req, res) => {
	var newsID = req.query.newsID;

	var db = req.db;
	var col = db.get("newsList");
	var col2 = db.get("userList");

	col.find({ "_id": newsID }).then((docs) => {
		var comments = docs[0].comments;
		var headline = docs[0].headline;
		var content = docs[0].content;
		var time = docs[0].time;

		// Sorting the comments by their post time

		var sorted_comments = comments.sort(sorting);

		// Rendering the HTML content

		var code = `<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="UTF-8">
						<meta http-equiv="X-UA-Compatible" content="IE=edge">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<link type="text/css" rel="stylesheet" href="/stylesheets/style.css?">
						<title>${headline}</title>
						<link rel="preconnect" href="https://fonts.googleapis.com">
						<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
						<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@100&family=Nanum+Gothic&family=Raleway:wght@300&family=Red+Hat+Mono:ital@1&display=swap" rel="stylesheet">
						<script src="/javascripts/script.js"></script>
					</head>
					<body>
						<div id="commentsHeader">
							<a id="backbtn" href="newsfeed.html">
								<img src="/images/back.png" alt="back image from /images/back.png">
							</a>
							<h1>${headline}</h1><br>
						</div>

						<p id="newsPostTime">${time.toLocaleString()}</p>

						<div id="commentsBody">
							<h2>${content}</h2>
						</div>
						
						<div id="allComments">`;

		// Looping over the sorted comments array to get specifics for each comment

		for (let i = 0; i < sorted_comments.length; i++) {
			var userID = sorted_comments[i].userID + "";
			console.log("userID: "+userID);

			// Finding the necessary information from the userList database

			col2.find({ _id: userID }).then((docs2) => {
				console.log("I AM HERE");
				console.log(docs2);
				var name = docs2[0].name;
				var icon = docs2[0].icon;
				var postTime = sorted_comments[i].time.toLocaleString();
				var comment = sorted_comments[i].comment;

				code += `<div id="eachComment">
							<img id="dp" src="${icon}">
							<h3>${name}</h3>
							<p>${postTime.toLocaleString()}</p>
							<h2>"${comment}"</h2>
						</div>`;

				// Adding the comment input textbox and submit button according to the login status of the user

				if (i == (sorted_comments.length - 1)){
					if (req.cookies.userID){
						code += `</div>
								<div id="addComment">
									<input id="comment_tb" type="text" placeholder="Enter comment here">
									<button type="button" id="commentbtn" onclick="postComment('${newsID}', '${postTime}')">Post Comment</button>
								</div>
							</body>
							</html>`;
					}
					else{
						code += `</div>
								<div id="addComment">
									<input id="comment_tb" type="text" placeholder="Disabled, please log in to comment..." disabled>
									<a href="/login?newsID=${newsID}">
										<button type="button" id="commentbtn">Log in</button>
									</a>
								</div>
							</body>
							</html>`;
					};
					res.send(code);
				};
			});
		};
	});
});

app.post("/handlePostComment", (req, res) => {
	var newsID = req.body.newsID;
	var comment_time = req.body.post_time.toLocaleString();
	var time = req.body.time;
	var comment = req.body.comment;
	var userID = req.cookies.userID;
	var comment_as_object = {"userID": userID, "time": comment_time, "comment": comment};

	var db = req.db;
	var col = db.get("newsList");
	var col2 = db.get("userList");

	// Adding the comment at the start of the comments array of the respective news item to execute the sorted functionality

	col.update({_id: newsID}, {$push: {comments: {$each:[comment_as_object], $position:0}}}).then((docs) => {
		console.log("update running");
	});

	// Finding the details of the person who commented

	col2.find({_id:userID}).then((docs2) => {
		console.log(docs2);
		var name = docs2[0].name;
		var icon = docs2[0].icon;
		var json = {"name":name, "icon":icon, "time": comment_time, "comment":comment};
		console.log(json);
		res.send(json);
	});
});

app.get("/login", (req, res) => {
	var newsID = req.query.newsID;
	if (newsID == 0) {
		var goBack = "/";
	}
	else {
		var goBack = `/displayNewsEntry?newsID=${newsID}`;
	}
	var code = `<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta http-equiv="X-UA-Compatible" content="IE=edge">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link type="text/css" rel="stylesheet" href="/stylesheets/style.css?">
					<title>Login</title>
					<script src="/javascripts/script.js"></script>
				</head>
				<body>
					<div id="form" onsubmit="return false">
						<h1 id="heading">Log in</h1>
						<form id="loginForm">
							<input type="text" id="username" placeholder="Username"><br><br>
							<input type="password" id="pwd" placeholder="Password" autocomplete="off"><br><br>
							<button onclick="login('${goBack}')">Submit</button><br><br>
						</form>
						<a href="${goBack}">Go back</a>
					</div>
				</body>
				</html>`;

	res.send(code);
});

app.get("/handleLogin", (req, res) => {
	console.log("login request received");
	var username = req.query.username;
	var pwd = req.query.password;
	var db = req.db;
	var col = db.get("userList");
	col.find({ name: username }).then((docs) => {
		if (docs.length != 0) {
			var user_id = docs[0]._id;
			if (docs[0].password == pwd) {
				res.cookie("userID", user_id, { maxAge: 60 * 10 * 1000 }); // Cookie set for 10 minutes
				res.send("login success");
			}
			else {
				res.send("incorrect credentials");
			}
		}
		else {
			res.send("incorrect credentials")
		}
	});
})

app.get("/handleLogout", (req, res) => {
	console.log("logout request received")
	res.clearCookie("userID");
	res.send("logout success");
});

var server = app.listen(8081, () => {
	var host = server.address().address;
	var port = server.address().port;
	console.log("lab5 app listening at http://%s:%s", host, port);
});
