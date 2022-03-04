const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format, compareAsc } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: databasePath,
            driver: sqlite3.Database,
        });

        app.listen(3000, () =>
            console.log("Server Running at http://localhost:3000/")
        );
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();

const categoryValue = (category) => {
    return category !== "LEARNING" && category !== "HOME" && category !== "WORK";
};

const priorityValue = (priority) => {
    return priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW";
};

const statusValue = (status) => {
    return status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE";
};

const dueDateValue = (dueDate) => {
    const dateFormate = format(new Date(dueDate), "yyyy-MM-dd");
    return dueDate !== dateFormate;
};

const categoryResponse = (response) => {
    return response.status(400), response.send("Invalid Todo Category");
};

const priorityResponse = (response) => {
    return response.status(400), response.send("Invalid Todo Priority");
};

const statusResponse = (response) => {
    return response.status(400), response.send("Invalid Todo Status");
};

const dueDateResponse = (response) => {
    return response.status(400), response.send("Invalid Due Date");
};

const convertTheDBToResponse = (dbObject) => {
    return {
        id: dbObject.id,
        todo: dbObject.todo,
        priority: dbObject.priority,
        status: dbObject.status,
        category: dbObject.category,
        dueDate: dbObject.due_date,
    };
};

app.get("/todos/", async (request, response) => {
    const { status, priority, search_q, category } = request.query;
    let getSqlQuery = "";
    switch (true) {
        case category !== undefined && priority !== undefined:
            if (categoryValue(category)) {
                categoryResponse(response);
            } else if (priorityValue(priority)) {
                priorityResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE category='${category}' and priority='${priority}';`;
            }
            break;

        case category !== undefined && status !== undefined:
            if (categoryValue(category)) {
                categoryResponse(response);
            } else if (statusValue(status)) {
                statusResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE category='${category}' and status='${status}';`;
            }
            break;

        case priority !== undefined && status !== undefined:
            if (priorityValue(priority)) {
                priorityResponse(response);
            } else if (statusValue(status)) {
                statusResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE status='${status}' and priority='${priority}';`;
            }
            break;

        case priority !== undefined:
            if (priorityValue(priority)) {
                priorityResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE priority='${priority}';`;
            }
            break;

        case status !== undefined:
            if (statusValue(status)) {
                statusResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE status='${status}';`;
            }
            break;

        case search_q !== undefined:
            getSqlQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
            break;
        case category !== undefined:
            if (categoryValue(category)) {
                categoryResponse(response);
            } else {
                getSqlQuery = `SELECT * FROM todo WHERE category='${category}';`;
            }
            break;
    }
    if (getSqlQuery !== "") {
        const dbResponse = await db.all(getSqlQuery);
        response.send(dbResponse.map((eachDB) => convertTheDBToResponse(eachDB)));
    }
});

app.get("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    const getOneSqlQuery = `SELECT * FROM todo WHERE id=${todoId};`;
    const dbResponse = await db.get(getOneSqlQuery);
    response.send(convertTheDBToResponse(dbResponse));
});

app.get("/agenda/", async (request, response) => {
    const { date } = request.query;
    let getDateSqlQuery = "";
    if (dueDateValue(date)) {
        dueDateResponse(response);
    } else {
        getDateSqlQuery = `SELECT * FROM todo WHERE due_date='${date}';`;
    }

    if (getDateSqlQuery !== "") {
        const dbResponse = await db.all(getDateSqlQuery);
        response.send(dbResponse.map((each) => convertTheDBToResponse(each)));
    }
});

app.post("/todos/", async (request, response) => {
    const { id, todo, priority, status, category, dueDate } = request.body;
    if (statusValue(status)) {
        statusResponse(response);
    } else if (priorityValue(priority)) {
        priorityResponse(response);
    } else if (categoryValue(category)) {
        categoryResponse(response);
    } else if (dueDateValue(dueDate)) {
        dueDateResponse(response);
    } else {
        const postSqlQuery = `
    INSERT INTO 
      todo (id,todo,priority,status,category,due_date)
    VALUES 
      (${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
        await db.run(postSqlQuery);
        response.status(200);
        response.send("Todo Successfully Added");
    }
});

app.put("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    let { status, priority, todo, dueDate, category } = request.body;
    let updatedColumn = "";
    if (status !== undefined) {
        if (statusValue(status)) {
            statusResponse(response);
        } else {
            updatedColumn = "Status Updated";
        }
    } else if (priority !== undefined) {
        if (priorityValue(priority)) {
            priorityResponse(response);
        } else {
            updatedColumn = "Priority Updated";
        }
    } else if (todo !== undefined) {
        updatedColumn = "Todo Updated";
    } else if (dueDate !== undefined) {
        if (dueDateValue(dueDate)) {
            dueDateResponse(response);
        } else {
            updatedColumn = "Due Date Updated";
        }
    } else {
        if (categoryValue(category)) {
            categoryResponse(response);
        } else {
            updatedColumn = "Category Updated";
        }
    }
    const getSqlQuery = `SELECT * FROM todo WHERE id=${todoId};`;
    const previousData = await db.get(getSqlQuery);
    (status = previousData.status),
        (priority = previousData.priority),
        (todo = previousData.todo),
        (dueDate = previousData.due_date),
        (category = previousData.category);

    const putSqlQuery = `
    UPDATE
      todo
    SET
       status='${status}',
       priority='${priority}',
       todo='${todo}',
       category='${category}',
       due_date='${dueDate}'
    WHERE id=${todoId};
      `;
    if (updatedColumn !== "") {
        const dbResponse = await db.run(putSqlQuery);
        response.send(updatedColumn);
    }
});

app.delete("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    const deleteSqlQuery = `DELETE FROM todo WHERE id=${todoId};`;
    db.run(deleteSqlQuery);
    response.send("Todo Deleted");
});

module.exports = app;