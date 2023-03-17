(module
    (export "varloop" (func $loop))
    (func $loop (param $i i32)(result i32)
    ;; return value of how many cycles he has done to 10
    (local $j i32) 
    i32.const 0
    local.set $j

        (loop $my_loop (result i32)
            ;; i++
            local.get $i ;;[i32]
            i32.const 1 ;;[i32 i32]
            i32.add ;;[i32]
            local.set $i ;;[]
            ;; j++
            local.get $j ;;[i32]
            i32.const 1 ;;[i32 i32]
            i32.add ;;[i32]
            local.set $j ;;[]

            local.get $i ;;[i32]
            i32.const 10 ;;[i32 i32]
            i32.lt_s ;;[i32]
            ;; br_if is just a br with an if incorporated
            br_if $my_loop ;; ;;[]
            ;; i
            local.get $j ;;[i32]
        )
        return
    )
    
)