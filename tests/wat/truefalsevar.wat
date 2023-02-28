(module
    (export "tfv" (func $tftest))
    (func $tftest (param $n i32)(result i32) 
    local.get $n
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