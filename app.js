let express = require('express');
let fetch = require('node-fetch');
let app = express();
let bluebird = require('bluebird');
let mysql = require('mysql');
const { resolve, reject } = require('bluebird');

fetch.Promise = bluebird;


// SQL CONNECTION AND CREATING DATABASE, TABLE.

let ourConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Daman6232'
});

ourConnection.connect((err)=>{
    if (err) console.log(err);
    else console.log('Connection success');
});

executeQueryPrint("CREATE DATABASE IF NOT EXISTS testing;", ourConnection, (result)=>{
    console.log(result);
    console.log('Created database');
});

executeQueryPrint("USE testing;", ourConnection);

checkIfTableExists('question_table', ourConnection).then((result) => {
    console.log("Resolved with ", result);
    if(!result){
        executeQueryPrint("CREATE TABLE question_table (" +
        "id INT PRIMARY KEY AUTO_INCREMENT, category VARCHAR(200) NOT NULL, question VARCHAR(1000) NOT NULL, incorrect VARCHAR(500), "+
        "correct VARCHAR(100));", ourConnection, (result)=>{
            console.log("Table created successfully");    
        });
    }else{
        console.log("table already exists");
    }
}).catch(()=>{
    console.log('oops! something went wrong.');
})



// API ENDPOINT:

app.use(express.static('static'));

app.get('/api/questions', (req, res) => {
    let amount = req.query.amount;
    let category = req.query.category;

    getRequiredQuestions(amount, category, ourConnection).then((result)=>{
        
        
        
        for(let obj of result){
            obj.incorrect = obj.incorrect.split(',');

            for(let i = 0; i < obj.incorrect.length; i ++){
                obj.incorrect[i] = obj.incorrect[i].trim();
            }

        }


        res.send(result);
    }).catch((err)=>{
        console.log("ERROR: ", err);
    })

    

});







// LISTENING TO PORT 3000
app.listen(3000, (err)=>{
    if(err){
        console.log(err);
    }else{
        console.log("Server has started");
    }
    
});




// Getting data from API and putting it into the database. ONLY REQUIRED FOR FIRST RUN.

// getFromAPI().then((result)=>{
//     putDataInTables(result);
//     console.log("Added data successfully");
// }).catch((err)=>{
//     console.log(err);
// });


// Puts the data in a table.
function putDataInTables(data){

    for(let {category, question, string, correct_answer} of data){
        executeQueryPromise(`INSERT INTO question_table(category, question, incorrect, correct) VALUES ("${category}", "${question}", "${string}", "${correct_answer}");`, ourConnection).then((result)=>{

        }).catch((err)=>{
            console.log(err);
        });
    }
    
}


// Executes a query and wraps around a promise.
function executeQueryPromise(query, ourConnection){
    return new Promise((resolve, reject)=>{
        ourConnection.query(query, (err, result)=>{
            if (err) {
                reject(err);
            }else{
                resolve(result);
            }
        })
    })
}



// Gets data from the open API.
function getFromAPI(){

    return new Promise((resolve, reject)=>{
        
        let data = [];
        
            for(let categoryNum = 9; categoryNum <= 32; categoryNum ++){                
                fetch(`https://opentdb.com/api.php?amount=50&category=${categoryNum}`).then(res => res.json()).then((response)=>{
                    let results = response.results;
                   
                    
                    results.forEach((obj) => {
                        let {category, question, incorrect_answers, correct_answer} = obj;

                        let string = null;
                        if (incorrect_answers.length == 1) {
                            string = incorrect_answers[0];
                        }else{
                            string = `${incorrect_answers[0]}, ${incorrect_answers[1]}, ${incorrect_answers[2]}`;
                        }
                        
                        data.push({category, question, string, correct_answer});
                        
                    });   
                    console.log(data.length);
                    if (data.length == 1050) {
                        resolve(data);
                    }
               }).catch((err)=>{
                   reject(err);
               });

               
            }
        
    });
}


// Performs Query and checks if result is empty;
function checkExistance(query, ourConnection){
    return new Promise((resolve, reject)=>{
        executeQueryPrint(query, ourConnection, (result)=>{
           
            console.log(result);
            if (!result) {
                reject();
            }else{                
                resolve(result.length == 1);
            }
        });
    });
}


// Checks if a table exists.
function checkIfTableExists(tableName, ourConnection){
    return checkExistance(`SHOW TABLES LIKE \'${tableName}\';`, ourConnection);
}


// Executes a query and prints the result to the console.
function executeQueryPrint(query, connection, onSuccess){
    connection.query(query, (err, result)=>{
        if (err) {
            console.log(err);
            onSuccess(null);
        }else if(onSuccess){
            onSuccess(result);
        }else if (result) {
            console.log(result);
        }
    });
}



// Gets data from sql server using some data.


function getRequiredQuestions(amount, category, ourConnection){
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM question_table WHERE category="${category}" ORDER BY RAND() LIMIT ${amount}`;

        executeQueryPromise(query, ourConnection).then(resolve).catch((err)=>{
            reject(err);
        });
    })
}