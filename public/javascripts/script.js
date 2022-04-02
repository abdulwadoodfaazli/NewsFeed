function loadNewsList(pageIndex){
    search = document.getElementById("textbox").value;
    
    if (search == null){
        search = "";
    };

    let header = document.getElementById("header");
    let news = document.getElementById("news");
    let pageindices = document.getElementById("pageindex");
    var xmlhttp = new XMLHttpRequest();

    console.log("request sent");

    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            console.log("response received");
            var res = JSON.parse(xmlhttp.responseText);

            total_entries = res[0].entries;
            console.log(total_entries);
            loginStatus = res[1].login_status;

            // Task 2, 1. (a)

            // Removing previous login/logout info
            if (document.getElementById("log") != null){
                document.getElementById("log").remove();
            };

            if (loginStatus == 0){
                var href = "/login?newsID=0";
                var innerhtml = "Log In";
            }
            else if (loginStatus == 1){
                var href = "javascript:logout()";
                var innerhtml = "Log Out";
            };

            header.innerHTML += `<a id="log" href="${href}">${innerhtml}</a>`;

            // // Task 2, 1. (b)
            var text = "";

            for (var i = 2; i < res.length; i++){
                var id = res[i].id;
                text += `<div id="eachNews"><h1><a id="newsHeading" href="/displayNewsEntry?newsID=${id}">${res[i].headline}</a></h1>`;
                text += "<p>"+new Date(res[i].time).toLocaleString()+"</p>";
                text += "<h2>"+res[i].content+"...</h2><br></div>";
            };

            news.innerHTML = text;

            // // Task 2, 1. (c)
            num_of_pages = Math.ceil(total_entries / 5);
            console.log(num_of_pages);
            pageindices.innerHTML = "";
            for (var i = 1; i <= num_of_pages; i++){
                if (i == pageIndex){
                    var pageNums = `<a style="color:#4287f5;" href="javascript:loadNewsList(${i})">${i}</a>`;
                }
                else{
                    var pageNums = `<a href="javascript:loadNewsList(${i})">${i}</a>`;
                }
                pageindices.innerHTML += "    "+pageNums+"    ";
            };
        };
    };

    xmlhttp.open("GET", "retrievenewslist?pageIndex="+pageIndex+"&searchstring="+search, true);
    xmlhttp.send();
};

function postComment(newsID, post_time){
    console.log("postComment running");
    var comment = document.getElementById("comment_tb").value;
    var allComments = document.getElementById("allComments");
    
    let header = document.getElementById("header");
    let news = document.getElementById("news");
    let pageindices = document.getElementById("pageindex");

    var xmlhttp = new XMLHttpRequest();
    if (comment == null || comment == ""){
        alert("No comment has been entered");
        return;
    }
    else{
        xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
                console.log("response received");
                var res = JSON.parse(xmlhttp.responseText);
                console.log(res);

                // Generate appropriate HTML for displaying comment here
                var code = `<div id="eachComment">
                                <img id="dp" src="${res.icon}">
                                <h3>${res.name}</h3>
                                <p>${res.time.toLocaleString()}</p>
                                <h2>"${res.comment}"</h2>
                            </div>`;

                code += allComments.innerHTML;
                document.getElementById("allComments").innerHTML = code;

                // Empty comment textbox here
                document.getElementById("comment_tb").value = "";
            };
        };
    };

    var json = {"comment":comment, "newsID":newsID, "time":post_time, "post_time":new Date().toLocaleString()};

    xmlhttp.open("POST", "handlePostComment", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(json));
};

function login(goBack){
    console.log("login running");
    var xmlhttp = new XMLHttpRequest();
    var username = document.getElementById("username").value;
    var pwd = document.getElementById("pwd").value;

    xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            var res = xmlhttp.responseText;

            if (res == "login success"){
                document.getElementById("loginForm").remove();
                document.getElementById("heading").innerHTML = "You have successfully logged in";
            }
            else{
                document.getElementById("heading").innerHTML = "Incorrect login credentials"
                document.getElementById("username").value = "";
                document.getElementById("pwd").value = "";
            }
        }
    };

    if (username == null || username == "" || pwd == null || pwd == ""){
        alert("Please enter username and password");
        return;
    }
    else{
        xmlhttp.open("GET", "handleLogin?username="+username+"&password="+pwd, true);
        xmlhttp.send();
    };
};

function logout(){
    console.log("logout running");
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            if (document.getElementById("log") != null){
                document.getElementById("log").remove();
            };
            document.getElementById("header").innerHTML += '<a id="log" href="/login?newsID=0">Log In</a>';
        };
    };
    xmlhttp.open("GET", "handleLogout", true);
    xmlhttp.send();
};