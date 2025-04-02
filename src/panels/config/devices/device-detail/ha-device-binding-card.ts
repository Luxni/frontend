import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, queryAll } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-textfield";

import type { HaTextField } from "../../../../components/ha-textfield";
import type { HomeAssistant } from "../../../../types";
import type { EntityRegistryStateEntry } from "../ha-config-device-page";

import type {
  MatterNodeBinding,
  MatterNodeDiagnostics,
} from "../../../../data/matter";

import { setMatterNodeBinding } from "../../../../data/matter";

declare global {
  interface HTMLElementEventMap {
    "node-binding-changed": CustomEvent<{
      nodeBinding: {};
      nodeDiagnostics: MatterNodeDiagnostics;
    }>;
  }
}

@customElement("ha-device-binding-card")
export class HaDeviceBindingCard extends LitElement {
  @property() public header!: string;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entities!: EntityRegistryStateEntry[];

  @state()
  public showHidden = false;

  @property({ attribute: false })
  public bindings?: Record<string, MatterNodeBinding[]>;

  @queryAll(".bindingTarget")
  private bindingTargetTextFiled!: NodeListOf<HaTextField>;

  async handleDeleteClickCallback(event: Event) {
    const button = event.target as HTMLElement;
    const index = Number(button.dataset.index);
    const endpoint = button.dataset.endpoint!;
    const bindings = this.bindings![endpoint];

    if (bindings) {
      const device_id = this.entities[0].device_id;
      // remove data
      bindings.splice(index, 1);
      // send to device
      const ret = await setMatterNodeBinding(
        this.hass,
        device_id!,
        Number(endpoint),
        bindings
      );

      if (ret[0].Status === 0) {
        this.bindings![endpoint].splice(index, 1);
        this.requestUpdate();
      }
    }
  }

  async handleAddClickCallback(_ev: Event): Promise<any> {
    if (this.bindings) {
      if (
        this.bindingTargetTextFiled[0].value === "" ||
        this.bindingTargetTextFiled[1].value === "" ||
        this.bindingTargetTextFiled[2].value === ""
      ) {
        // notify in here
        return;
      }

      const source_endpoint = Number(this.bindingTargetTextFiled[0].value);
      const target_node = Number(this.bindingTargetTextFiled[1].value);
      const target_endpoint = Number(this.bindingTargetTextFiled[2].value);

      const device_id = this.entities[0].device_id;
      const bindings = this.bindings![source_endpoint];

      if (source_endpoint === 0 || target_node === 0 || target_endpoint === 0) {
        // notify in here
        return;
      }

      const nodeBinding: MatterNodeBinding = {
        node: target_node,
        endpoint: target_endpoint,
        group: null,
        cluster: null,
        fabricIndex: null,
      };

      const ret = await setMatterNodeBinding(
        this.hass,
        device_id!,
        source_endpoint,
        bindings
      );

      if (ret[0].Status === 0) {
        this.bindings[source_endpoint].push(nodeBinding);
        this.requestUpdate();
      }
    }
  }

  private _handleNodeBindingChanged(
    event: CustomEvent<{
      nodeBinding: Record<string, MatterNodeBinding[]>;
      nodeDiagnostics: MatterNodeDiagnostics;
    }>
  ) {
    if (event.detail.nodeBinding) {
      this.bindings = event.detail.nodeBinding;
    }
    this.showHidden = true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "node-binding-changed",
      this._handleNodeBindingChanged
    );
  }

  protected render(): TemplateResult {
    if (!this.showHidden) {
      return html`<p></p>`;
    }

    return html`
      <ha-card .header=${this.header}>
        <div class="card-content">
          <div class="header-row header-title">
            <div class="header-column">source endpoint</div>
            <div class="header-columns">
              <div>target node</div>
              <div>target endpoint</div>
            </div>
            <div style="flex:0.2"></div>
          </div>

          ${this.bindings
            ? Object.entries(this.bindings).map(
                ([key, value]) => html`
                  ${value.map(
                    (nodeItem, index) => html`
                      <div class="header-row binding-row">
                        <div class="binding-column">${key}</div>
                        <div class="binding-columns grid-container">
                          <div>
                            ${nodeItem.node == null ? "null" : nodeItem.node}
                          </div>
                          <div>
                            ${nodeItem.endpoint == null
                              ? "null"
                              : nodeItem.endpoint}
                          </div>
                        </div>
                        <ha-button
                          class="binding-button"
                          data-endpoint=${key}
                          data-index=${index}
                          label="delete"
                          @click=${this.handleDeleteClickCallback}
                        ></ha-button>
                      </div>
                    `
                  )}
                `
              )
            : nothing}

          <div class="binding-controls">
            <ha-textfield class="bindingTarget" label="source endpoint">
            </ha-textfield>

            <ha-textfield class="bindingTarget" label="target node">
            </ha-textfield>

            <ha-textfield class="bindingTarget" label="target endpoint">
            </ha-textfield>

            <ha-button @click=${this.handleAddClickCallback}>
              ${this.hass.localize(
                "ui.panel.config.devices.entities.binding.add"
              )}
            </ha-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .card-content {
      display: grid;
      padding: 8px;
      gap: 5px;
    }

    .header-row {
      display: flex;
      padding: 2px;
      height: 30px;
      align-items: center;
      justify-content: center;
    }

    .header-row div {
      flex: 1;
    }

    .header-title {
      font-weight: bold;
      gap: 4px;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }

    .header-column {
      flex: 0.3;
      text-align: center;
    }

    .header-columns {
      display: flex;
      flex: 0.5;
    }

    .header-columns div {
      flex: 0.5;
      text-align: center;
    }

    .grid-container {
      display: flex;
      height: 36px;
    }

    .binding-row {
      gap: 2px;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }

    .binding-column {
      flex: 0.3;
      align-items: center;
      text-align: center;
    }

    .binding-columns {
      flex: 0.5;
      align-items: center;
      text-align: center;
    }

    .binding-controls {
      display: flex;
      flex: 0.3;
      gap: 4px;
    }

    .binding-controls ha-textfield {
      flex: 0.3;
    }

    .binding-controls ha-button {
      flex: 0.1;
      align-items: center;
    }

    .binding-button {
      flex: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
