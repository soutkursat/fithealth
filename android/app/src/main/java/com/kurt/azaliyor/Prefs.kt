package com.kurt.azaliyor

import android.content.Context

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("kurt", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = sp.getString("serverUrl", "") ?: ""
        set(v) = sp.edit().putString("serverUrl", v.trim().trimEnd('/')).apply()

    var token: String
        get() = sp.getString("token", "") ?: ""
        set(v) = sp.edit().putString("token", v.trim()).apply()

    var lastResult: String
        get() = sp.getString("lastResult", "") ?: ""
        set(v) = sp.edit().putString("lastResult", v).apply()

    val isConfigured: Boolean
        get() = serverUrl.startsWith("http") && token.isNotEmpty()
}
