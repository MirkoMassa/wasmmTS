(module
    (export "i32store" (func $i32store))
    (memory (export "memory") 1)
    (func $i32store (param $val i32)
        i32.const 0
        local.get $val
        i32.store
    )
)