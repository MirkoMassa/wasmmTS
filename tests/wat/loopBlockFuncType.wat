(module
    (export "varloop" (func $loop))
    (func $loop (param $i i32)(result i32 i32)
    ;; return value of how many cycles he has done to 10
    (local $j i32) 
    i32.const 0
    local.set $i
    i32.const 1
    local.set $j
    local.get $i
    local.get $j

        (block $my_loop (param i32 i32) (result i32 i32)
            i32.add
            local.get $j
            local.set $i
            local.set $j

            local.get $i
            local.get $j
            local.get $j
            i32.const 1000

            i32.lt_s
            ;; br_if is just a br with an if incorporated
            br_if $my_loop ;; if $i is less than 10 branch to $my_loop
        )
        return
    )
    
)