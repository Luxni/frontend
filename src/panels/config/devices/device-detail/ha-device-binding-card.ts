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
      const source_endpoint_id = this.bindingTargetTextFiled[0].value;
      const target_node_id = this.bindingTargetTextFiled[1].value;
      const target_endpoint_id = this.bindingTargetTextFiled[2].value;

      const endpoint = Number(source_endpoint_id);
      const device_id = this.entities[0].device_id;
      const bindings = this.bindings![endpoint];

      const nodeBinding: MatterNodeBinding = {
        node: Number(target_node_id),
        endpoint: Number(target_endpoint_id),
        group: null,
        cluster: null,
        fabricIndex: null,
      };

      const ret = await setMatterNodeBinding(
        this.hass,
        device_id!,
        endpoint,
        bindings
      );

      if (ret[0].Status === 0) {
        this.bindings[source_endpoint_id].push(nodeBinding);
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
        <div style="display:grid;padding:8px;gap:5px;">
          <div
            style="font-weight:bold;gap:4px;border-bottom:2px solid #333;padding-bottom:8px"
            class="header-row"
          >
            <div style="flex:0.3;text-align:center">source endpoint</div>
            <div style="display:flex; flex:0.5">
              <div style="flex:0.5;text-align:center">target node</div>
              <div style="flex:0.5;text-align:center">target endpoint</div>
            </div>
            <div style="flex:0.2"></div>
          </div>

          ${this.bindings
            ? Object.entries(this.bindings).map(
                ([key, value]) => html`
                  ${value.map(
                    (nodeItem, index) => html`
                      <div
                        style="gap:2px;border-bottom:2px solid #333;padding-bottom:8px"
                        class="header-row"
                      >
                        <div
                          style="flex:0.3;align-items:center;text-align:center"
                        >
                          ${key}
                        </div>
                        <div
                          style="flex:0.5;align-items:center;text-align:center"
                          class="grid-container"
                        >
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
                          style="flex:0.2"
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

          <div style="display:flex;gap:4px;">
            <ha-textfield
              style="flex:0.3"
              class="bindingTarget"
              label="source endpoint"
              type="number"
            >
            </ha-textfield>

            <ha-textfield
              style="flex:0.3"
              class="bindingTarget"
              label="target node"
              type="number"
            >
            </ha-textfield>

            <ha-textfield
              style="flex:0.3"
              class="bindingTarget"
              label="target endpoint"
              type="number"
            >
            </ha-textfield>

            <ha-button
              style="flex:0.1;align-items:center"
              @click=${this.handleAddClickCallback}
            >
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

    .grid-container {
      display: flex;
      height: 36px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
