// Top‐level UI configuration
export interface UIConfig {
    personas: PersonaConfig[];
}

// Persona definition
export interface PersonaConfig {
    id: string;
    displayName: string;
    permissions: Permissions;
    screens: Screen[];
}

export interface Permissions {
    read: string[];
    write: string[];
}

// Screen union
export type Screen =
    | ConnectWalletScreen
    | PanelScreen
    | FormScreen
    | GenericScreen
    | DashboardScreen
    | ToggleScreen
    | LinkListScreen;

// Screen types
export interface ConnectWalletScreen {
    id: string;
    type: 'connect_wallet';
    props: {
        prompt: string;
    };
}

export interface PanelScreen {
    id: string;
    type: 'panel';
    title: string;
    components: Component[];
}

export interface FormScreen {
    id: string;
    type: 'form';
    title: string;
    components: Component[];
}

export interface GenericScreen {
    id: string;
    type: 'screen';
    title: string;
    components: Component[];
}

export interface DashboardScreen {
    id: string;
    type: 'dashboard';
    title: string;
    components: Component[];
}

export interface ToggleScreen {
    id: string;
    type: 'toggle';
    label: string;
    default: boolean;
}

export interface LinkListScreen {
    id: string;
    type: 'link_list';
    title: string;
    items: LinkItem[];
}

export interface LinkItem {
    label: string;
    urlTemplate: string;
}

// Component union
export type Component =
    | ButtonComponent
    | NumericDisplayComponent
    | ToggleComponent
    | ChoiceSelectorComponent
    | TxDetailsComponent
    | TextComponent
    | BarChartComponent;

// Button component
export interface ButtonComponent {
    type: 'button';
    id: string;
    label: string;
    action: ButtonAction;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
    disabledBoundTo?: string;
    statusFlows?: StatusFlow[];
}

export type ButtonAction =
    | { type: 'deployContract' }
    | {
        type: 'invokeFunction';
        function: string;
        args?: Record<string, string>;
    };

export interface StatusFlow {
    status: string;
    label: string;
    nextScreen?: string;
}

// Numeric display
export interface NumericDisplayComponent {
    type: 'numeric_display';
    id: string;
    label: string;
    dataSource: DataSource;
    autoRefreshBoundTo?: string;
}

export interface DataSource {
    function: string;
}

// Toggle component
export interface ToggleComponent {
    type: 'toggle';
    id: string;
    label: string;
    default: boolean;
}

// Choice selector
export interface ChoiceSelectorComponent {
    type: 'choice_selector';
    id: string;
    label: string;
    options: ChoiceOption[];
    singleSelect: boolean;
}

export interface ChoiceOption {
    label: string;
    value: number;
}

// Transaction details
export interface TxDetailsComponent {
    type: 'tx_details';
    id: string;
    dataSource: {
        function: string;
        fetch: 'lastTransaction';
    };
}

// Text block
export interface TextComponent {
    type: 'text';
    id: string;
    content: string;
}

// Bar chart of distribution
export interface BarChartComponent {
    type: 'bar_chart';
    id: string;
    dataSource: {
        type: 'functionResults';
        functions: string[];
    };
}
