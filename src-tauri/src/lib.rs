pub mod config;
pub mod hermes;
pub mod installer;
pub mod session;
pub mod ssh;
pub mod profile;
pub mod model;
pub mod cron;
pub mod sse;
pub mod skills;
pub mod tools;
pub mod memory;
pub mod gateway;
pub mod kanban;
pub mod soul;
pub mod claw3d;
pub mod system;
pub mod utils;
pub mod security;
pub mod commands;

use commands::config_commands::*;
use commands::hermes_commands::*;
use commands::session_commands::*;
use commands::profile_commands::*;
use commands::installer_commands::*;
use commands::ssh_commands::*;
use commands::model_commands::*;
use commands::tools_commands::*;
use commands::skills_commands::*;
use commands::memory_commands::*;
use commands::cron_commands::*;
use commands::gateway_commands::*;
use commands::kanban_commands::*;
use commands::soul_commands::*;
use commands::claw3d_commands::*;
use commands::system_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let _ = security::configure_security(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            read_config,
            write_config,
            get_env,
            set_env,
            get_all_env,
            check_config_health,
            start_hermes,
            stop_hermes,
            restart_hermes,
            get_hermes_status,
            is_hermes_installed,
            get_hermes_version,
            list_sessions,
            get_session,
            search_sessions,
            create_session,
            delete_session,
            get_messages,
            add_message,
            list_profiles,
            create_profile,
            delete_profile,
            switch_profile,
            get_active_profile,
            check_dependencies,
            install_hermes,
            get_install_status,
            ssh_connect,
            ssh_disconnect,
            ssh_is_connected,
            ssh_execute,
            list_saved_models,
            save_model,
            delete_model,
            discover_models,
            list_tools,
            run_tool,
            install_tool,
            uninstall_tool,
            toggle_tool,
            list_skills,
            get_skill,
            activate_skill,
            deactivate_skill,
            install_skill,
            uninstall_skill,
            store_memory,
            recall_memory,
            search_memories,
            delete_memory,
            clear_memories,
            get_memory_stats,
            list_cron_jobs,
            create_cron_job,
            delete_cron_job,
            pause_cron_job,
            resume_cron_job,
            get_gateway_status,
            start_gateway,
            stop_gateway,
            restart_gateway,
            get_gateway_config,
            update_gateway_config,
            list_gateways,
            configure_gateway,
            test_gateway,
            list_boards,
            create_board,
            delete_board,
            get_board,
            add_card,
            move_card,
            get_soul_config,
            update_soul_config,
            get_soul_status,
            reload_soul,
            get_scene,
            load_scene,
            get_objects,
            select_object,
            transform_object,
            get_app_info,
            backup_data,
            import_data,
            open_logs,
            check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
