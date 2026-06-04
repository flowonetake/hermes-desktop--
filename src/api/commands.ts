import { invoke } from '@tauri-apps/api/core';
import type { Session, Message, Profile, ModelConfig, AppInfo, DependencyStatus, ConfigHealth } from '../types';

export const getConfig = (path: string) => invoke<string | null>('get_config', { path });
export const setConfig = (path: string, value: string) => invoke<void>('set_config', { path, value });
export const readConfig = () => invoke<string>('read_config');
export const writeConfig = (configJson: string) => invoke<void>('write_config', { configJson });
export const getEnv = (key: string) => invoke<string | null>('get_env', { key });
export const setEnv = (key: string, value: string) => invoke<void>('set_env', { key, value });
export const getAllEnv = () => invoke<Record<string, string>>('get_all_env');
export const checkConfigHealth = () => invoke<ConfigHealth>('check_config_health');

export const startHermes = (configDir: string, port: number) => invoke<void>('start_hermes', { configDir, port });
export const stopHermes = () => invoke<void>('stop_hermes');
export const restartHermes = () => invoke<void>('restart_hermes');
export const getHermesStatus = () => invoke<string>('get_hermes_status');
export const isHermesInstalled = () => invoke<boolean>('is_hermes_installed');
export const getHermesVersion = () => invoke<string | null>('get_hermes_version');

export const listSessions = (limit: number, offset: number) => invoke<Session[]>('list_sessions', { limit, offset });
export const getSession = (id: string) => invoke<Session | null>('get_session', { id });
export const searchSessions = (query: string) => invoke<Session[]>('search_sessions', { query });
export const createSession = (sessionJson: string) => invoke<void>('create_session', { sessionJson });
export const deleteSession = (id: string) => invoke<void>('delete_session', { id });
export const getMessages = (sessionId: string) => invoke<Message[]>('get_messages', { sessionId });
export const addMessage = (msgJson: string) => invoke<void>('add_message', { msgJson });

export const listProfiles = () => invoke<Profile[]>('list_profiles');
export const createProfile = (name: string) => invoke<Profile>('create_profile', { name });
export const deleteProfile = (name: string) => invoke<void>('delete_profile', { name });
export const switchProfile = (name: string) => invoke<void>('switch_profile', { name });
export const getActiveProfile = () => invoke<string | null>('get_active_profile');

export const checkDependencies = () => invoke<DependencyStatus>('check_dependencies');
export const installHermes = () => invoke<string>('install_hermes');
export const getInstallStatus = () => invoke<string>('get_install_status');

export const sshConnect = (configJson: string) => invoke<void>('ssh_connect', { configJson });
export const sshDisconnect = () => invoke<void>('ssh_disconnect');
export const sshIsConnected = () => invoke<boolean>('ssh_is_connected');
export const sshExecute = (command: string) => invoke<string>('ssh_execute', { command });

export const listSavedModels = () => invoke<ModelConfig[]>('list_saved_models');
export const saveModel = (modelJson: string) => invoke<void>('save_model', { modelJson });
export const deleteModel = (name: string) => invoke<void>('delete_model', { name });
export const discoverModels = (provider: string) => invoke<string[]>('discover_models', { provider });

export const listTools = () => invoke<string[]>('list_tools');
export const runTool = (name: string, input: string) => invoke<string>('run_tool', { name, input });
export const installTool = (name: string, source: string) => invoke<void>('install_tool', { name, source });
export const uninstallTool = (name: string) => invoke<void>('uninstall_tool', { name });
export const toggleTool = (name: string, enabled: boolean) => invoke<void>('toggle_tool', { name, enabled });

export const listSkills = () => invoke<string[]>('list_skills');
export const getSkill = (name: string) => invoke<string | null>('get_skill', { name });
export const activateSkill = (name: string) => invoke<void>('activate_skill', { name });
export const deactivateSkill = (name: string) => invoke<void>('deactivate_skill', { name });
export const installSkill = (name: string, source: string) => invoke<void>('install_skill', { name, source });
export const uninstallSkill = (name: string) => invoke<void>('uninstall_skill', { name });
export const removeSkill = (name: string) => invoke<void>('uninstall_skill', { name });

export const storeMemory = (key: string, value: string) => invoke<void>('store_memory', { key, value });
export const recallMemory = (key: string) => invoke<string | null>('recall_memory', { key });
export const searchMemories = (query: string) => invoke<[string, string][]>('search_memories', { query });
export const deleteMemory = (key: string) => invoke<void>('delete_memory', { key });
export const clearMemories = () => invoke<void>('clear_memories');
export const getMemoryStats = () => invoke<Record<string, number>>('get_memory_stats');

export const listCronJobs = () => invoke<string[]>('list_cron_jobs');
export const createCronJob = (jobJson: string) => invoke<void>('create_cron_job', { jobJson });
export const updateCronJob = (jobJson: string) => invoke<void>('update_cron_job', { jobJson });
export const deleteCronJob = (id: string) => invoke<void>('delete_cron_job', { id });
export const pauseCronJob = (id: string) => invoke<void>('pause_cron_job', { id });
export const resumeCronJob = (id: string) => invoke<void>('resume_cron_job', { id });

export const getGatewayStatus = () => invoke<string>('get_gateway_status');
export const startGateway = () => invoke<void>('start_gateway');
export const stopGateway = () => invoke<void>('stop_gateway');
export const restartGateway = () => invoke<void>('restart_gateway');
export const getGatewayConfig = () => invoke<string>('get_gateway_config');
export const updateGatewayConfig = (configJson: string) => invoke<void>('update_gateway_config', { configJson });

export const getKanbanData = () => invoke<string>('get_board');
export const updateKanbanColumn = (columnJson: string) => invoke<void>('add_card', { boardId: 'default', cardJson: columnJson });

export const listBoards = () => invoke<string[]>('list_boards');
export const createBoard = (name: string) => invoke<void>('create_board', { name });
export const deleteBoard = (id: string) => invoke<void>('delete_board', { id });
export const getBoard = (id: string) => invoke<string | null>('get_board', { id });
export const addCard = (boardId: string, cardJson: string) => invoke<void>('add_card', { boardId, cardJson });
export const moveCard = (cardId: string, targetColumn: string) => invoke<void>('move_card', { cardId, targetColumn });

export const getSoulContent = () => invoke<string>('get_soul_config');
export const updateSoulContent = (content: string) => invoke<void>('update_soul_config', { configJson: content });
export const resetSoulToDefault = () => invoke<void>('reload_soul');

export const getSoulConfig = () => invoke<string>('get_soul_config');
export const updateSoulConfig = (configJson: string) => invoke<void>('update_soul_config', { configJson });
export const getSoulStatus = () => invoke<string>('get_soul_status');
export const reloadSoul = () => invoke<void>('reload_soul');

export const listGateways = () => invoke<string[]>('list_gateways');
export const configureGateway = (gatewayJson: string) => invoke<void>('configure_gateway', { gatewayJson });
export const testGateway = (name: string) => invoke<boolean>('test_gateway', { name });

export const startOfficeServer = () => invoke<void>('start_office_server');
export const stopOfficeServer = () => invoke<void>('stop_office_server');
export const getOfficeStatus = () => invoke<string>('get_office_status');
export const listAdapters = () => invoke<string[]>('list_adapters');

export const getAppInfo = () => invoke<AppInfo>('get_app_info');
export const backupData = () => invoke<string>('backup_data');
export const importData = (backupPath: string) => invoke<void>('import_data', { backupPath });
export const openLogsDir = () => invoke<void>('open_logs');
export const checkUpdate = () => invoke<string | null>('check_update');
