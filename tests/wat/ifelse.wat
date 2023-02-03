(module
    (func $dummy)
    (func $dummy2)
    (func $a (param i32)
        (if (local.get 0)
            (then
                (call $dummy)
            )
            (else
                (call $dummy2)
            )
        )
    )
)