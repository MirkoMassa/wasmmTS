import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { dirname } from 'path';

// REST
/*
HTTP Request types
GET - request data
POST - send data to the webserver (creating assests)
OPTION - request metadata / headers for a page (no html body is returned)
PUT - updating data that already exists
DELETE - removes data from some resource
*/
/*
1. create a list of wat/wasm files
2. Move them into the static folder of a webserver
*/
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('./tests'));
console.log(process.cwd())
app.listen(4000, () => {
    console.log('Server listening on port 4000');
});

export default app;