(module
    (func $popcnt (param $num i32)(result i32)
        local.get 0
        i32.popcnt
    )
    (export "popcnt" (func $popcnt))
)