(module
    (func $dummy)
    (func $a (result i32)
        (loop (result i32) (block (result i32)
            (call $dummy) 
            (i32.const 150)
        ))
    )
)