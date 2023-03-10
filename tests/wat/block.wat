(module
    (export "block" (func $block))
    (func $block (param $i i32)(result i32)
    ;; return value of how many cycles he has done to 10

        (block $my_block (result i32)

            local.get $i
            i32.const 5
            ;; break the block if i>5
            i32.gt_s
            (if (result i32)
            (then
                i32.const 1
                br $my_block
            )
            (else
                i32.const 10
            ))
            
        )

        ;; if i>5 the block returns 1, otherwise 5
        local.get $i
        i32.add
        return
    )
    
)