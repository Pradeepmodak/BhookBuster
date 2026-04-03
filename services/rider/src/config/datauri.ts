import  DataUriParser  from "datauri/parser.js";
import path from "path";


// Converts uploaded file → Data URI (base64 string)
const getBuffer=(file:any)=>{
    // create an instance of the DataUriParser
    const parser=new DataUriParser();

    // get the file extension from the original file name
    const extName=path.extname(file.originalname).toString();

    // format the file buffer into a Data URI string
    return parser.format(extName,file.buffer);
};

export default getBuffer;