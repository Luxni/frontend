import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-textfield/mwc-textfield";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, queryAll } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { TextField } from "@material/mwc-textfield/mwc-textfield";
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
      nodeBinding: MatterNodeBinding[];
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
  public bindings?: MatterNodeBinding[];

  @queryAll(".bindingTarget")
  private bindingTargetTextFiled!: NodeListOf<TextField>;

  // @state()
  // private _nodeDiagnostics?: MatterNodeDiagnostics;

  handleDeleteClickCallback(event: Event) {
    const button = event.target as HTMLElement;
    const index = Number(button.dataset.index);

    if (this.bindings) {
      const endpoint = this.bindings[index].endpoint;
      const device_id = this.entities[0].device_id;

      // remove data
      this.bindings?.splice(index, 1);

      // send to device
      setMatterNodeBinding(this.hass, device_id!, endpoint, this.bindings);
    }
    this.requestUpdate();
  }

  handleAddClickCallback(_ev: Event): void {
    if (this.bindings) {
      const source_endpoint_id = this.bindingTargetTextFiled[0].value;
      const target_node_id = this.bindingTargetTextFiled[1].value;
      const target_endpoint_id = this.bindingTargetTextFiled[2].value;
      const target_cluster_id = this.bindingTargetTextFiled[3].value;

      const endpoint = Number(source_endpoint_id);
      const device_id = this.entities[0].device_id;

      const nodeBinding: MatterNodeBinding = {
        node: Number(target_node_id),
        endpoint: Number(target_endpoint_id),
        group: null,
        cluster: target_cluster_id === "" ? null : Number(target_cluster_id),
        fabricIndex: null,
      };
      this.bindings?.push(nodeBinding);

      setMatterNodeBinding(this.hass, device_id!, endpoint, this.bindings);

      this.requestUpdate();
    }
  }

  private _handleNodeBindingChanged(
    event: CustomEvent<{
      nodeBinding: MatterNodeBinding[];
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

    const bindings: MatterNodeBinding[] = [];

    if (this.bindings) {
      this.bindings.forEach((device) => {
        bindings.push(device);
      });
    }

    return html`
      <ha-card .header=${this.header}>
        ${bindings.length
          ? html`
              <div>
                <mwc-list>
                  ${bindings.map(
                    (device, index) => html`
                      <div class="grid-container">
                        <mwc-list-item disabled>
                          <mwc-textfield
                            .value=${String(device.node)}
                          ></mwc-textfield>
                          <mwc-textfield
                            .value=${String(device.endpoint)}
                          ></mwc-textfield>
                          <mwc-textfield
                            .value=${String(device.cluster)}
                          ></mwc-textfield>
                        </mwc-list-item>
                        <mwc-button
                          label="delete"
                          data-index=${index}
                          @click=${this.handleDeleteClickCallback}
                        ></mwc-button>
                      </div>
                    `
                  )}
                </mwc-list>
              </div>
            `
          : nothing}

        <div></div>

        <div class="grid-container">
          <mwc-textfield
            class="bindingTarget"
            outlined
            label="source endpoint id"
          ></mwc-textfield>

          <mwc-textfield
            class="bindingTarget"
            outlined
            label="target node id"
          ></mwc-textfield>

          <mwc-textfield
            class="bindingTarget"
            outlined
            label="target endpoint id"
          ></mwc-textfield>

          <mwc-textfield
            class="bindingTarget"
            outlined
            label="target cluster id"
          ></mwc-textfield>

          <mwc-button @click=${this.handleAddClickCallback}>
            ${this.hass.localize(
              "ui.panel.config.devices.entities.binding.add"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  static styles = css`

    mwc-list > * {
      margin: 8px 0px;
    }

    .grid-container {
      display: flex;
      grid-template-columns: repeat(
        auto-fit,
        minmax(10px, 1fr)
      );
      height:48px;
      margin: 8px 8px;
      gap: 10px;
    }

  
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
