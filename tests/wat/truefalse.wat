(module
    (export "tf" (func $tftest))
    (func $tftest (result i32) 
    i32.const 5
        if 
            i32.const 55
            return
        else
            i32.const 7
            return
        end
        unreachable
    )
    
)