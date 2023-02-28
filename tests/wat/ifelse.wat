(module
    (func $dummy)
    (func $dummy2)
    (func $test (param $in i32) (result i32 )
        ;; local.get $in
        i32.const 0
        if (result i32 i32)
            i32.const 1
            i32.const 2
        else
            i32.const 1
            i32.const 3
        end
            i32.add 
        return
    )
)