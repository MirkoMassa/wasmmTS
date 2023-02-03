(module
    (func $dummy)
    (func $a (param i32)
        (if (local.get 0) 
            (then
                (call $dummy)
            )
        )
    )
)