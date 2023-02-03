export function enumRange(e1:number, e2:number, object:Object):number[]{
    const res:number[] = [];
    let i = 0;
    for (let i = e1; i <= e2 ; i++){
        if(i in object) res.push(i);
    }
    // res.push(e2);
    return res;

}

// test
export function logAsHex(numbers:number[]){ 
    let res = "";
    numbers.forEach(num => {res = res.concat(num.toString(16)+", ")});
    res = res.slice(0, res.length-2)
    console.log(res);
}