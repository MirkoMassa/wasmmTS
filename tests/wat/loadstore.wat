(module
    (export "i32store" (func $i32store))
    (memory (export "memory") 1)
    (func $i32store (param $val i32)
        ;; first store
        i32.const 0
        local.get $val
        i32.store
        ;; second store
        i32.const 4
        i32.const 9
        i32.store
    )
)