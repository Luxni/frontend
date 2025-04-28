import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import memoizeOne from "memoize-one";

import "../../../../../components/ha-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-state-icon";
import "../../../../../components/ha-icon-next";

import type { HomeAssistant } from "../../../../../types";
import type { HaSelect } from "../../../../../components/ha-select";
import type { MatterNodeBindingDialogParams } from "./show-dialog-matter-node-binding";
import type { MatterNodeBinding } from "../../../../../data/matter";
import type { EntityRegistryEntry } from "../../../../../data/entity_registry";
import type { EntityRegistryStateEntry } from "../../../devices/ha-config-device-page";

import { ASSIST_ENTITIES, SENSOR_ENTITIES } from "../../../../../common/const";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { groupBy } from "../../../../../common/util/group-by";

import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import { createCloseHeading } from "../../../../../components/ha-dialog";

export interface ItemSelectedEvent {
  target?: HaSelect;
  value?: string;
  index?: number;
}

@customElement("dialog-matter-node-binding")
class DialogMatterNodeBinding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterNodeBindingDialogParams;

  @state() private device_id?: string;

  @state() private bindings?: Record<string, MatterNodeBinding[]>;

  @property({ attribute: false }) public entities!: EntityRegistryEntry[];

  private _handleSelectionChange(_e: CustomEvent) {
    this.requestUpdate();
  }

  public async showDialog(
    params: MatterNodeBindingDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
    this.bindings = params.bindings;
    this._params = params;
    this.entities = params.entities;
  }

  private _createNodeBinding(
    targetNodeId: number,
    targetNodeEndpoint: number
  ): MatterNodeBinding {
    return {
      node: targetNodeId,
      group: null,
      endpoint: targetNodeEndpoint,
      cluster: null,
      fabricIndex: null,
    };
  }

  private _isBindingExists(
    sourceEndpoint: string,
    binding: MatterNodeBinding
  ): boolean {
    return this.bindings![sourceEndpoint].some(
      (node) => node.node === binding.node && node.endpoint === binding.endpoint
    );
  }

  private _handleAddClick(_event: Event) {
    try {
      const sourceSelect: HaSelect = this.shadowRoot!.querySelector(
        ".binding-controls ha-select:nth-child(2)"
      )!;
      const source_endpoint = sourceSelect.value;

      const targetSelect: HaSelect = this.shadowRoot!.querySelector(
        ".binding-controls ha-select:nth-child(4)"
      )!;
      const unique_id = targetSelect.value;
      const target_node = unique_id.split("-");
      const target_node_id = parseInt(target_node[1], 16);
      const target_node_endpoint = parseInt(target_node[3], 16);

      const nodeBinding = this._createNodeBinding(
        target_node_id,
        target_node_endpoint
      );
      if (!this._isBindingExists(source_endpoint, nodeBinding)) {
        this.bindings![source_endpoint].push(nodeBinding);
        this._params?.onUpdate(Number(source_endpoint), this.bindings!);
      }
    } catch (_error) {
      fireEvent(this, "hass-notification", {
        message: "Failed to add binding",
      });
    } finally {
      this.closeDialog();
    }
  }

  private _entitiesByCategory = memoizeOne(
    (entities: EntityRegistryEntry[]) => {
      const result = groupBy(entities, (entry) => {
        const domain = computeDomain(entry.entity_id);

        if (ASSIST_ENTITIES.includes(domain)) {
          return "assist";
        }

        if (domain === "event" || domain === "notify") {
          return domain;
        }

        if (entry.entity_category) {
          return entry.entity_category;
        }

        if (SENSOR_ENTITIES.includes(domain)) {
          return "sensor";
        }

        return "control";
      }) as Record<
        | "control"
        | "event"
        | "sensor"
        | "assist"
        | "notify"
        | NonNullable<EntityRegistryEntry["entity_category"]>,
        EntityRegistryStateEntry[]
      >;
      for (const key of [
        "assist",
        "config",
        "control",
        "diagnostic",
        "event",
        "notify",
        "sensor",
      ]) {
        if (!(key in result)) {
          result[key] = [];
        }
      }

      return result;
    }
  );

  protected render() {
    if (!this.device_id) {
      return nothing;
    }

    const matterEntities = Object.values(this.entities).filter(
      (entity) =>
        entity.platform === "matter" && entity.device_id !== this.device_id
    );
    const entitiesByCategory = this._entitiesByCategory(matterEntities);

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "")}
      >
        <section class="binding-controls">
          <div>Source Endpoint</div>
          <ha-select @closed=${stopPropagation} fixedMenuPosition>
            ${Object.entries(this.bindings!).map(
              ([key]) => html`
                <ha-list-item .value=${key}>
                  <span>${"endpoint: " + key}</span>
                </ha-list-item>
              `
            )}
          </ha-select>
          <div>Target</div>
          <ha-select
            @closed=${stopPropagation}
            fixedMenuPosition
            @selected=${this._handleSelectionChange}
          >
            ${entitiesByCategory.control.map(
              (entity) => html`
                <ha-list-item twoline graphic="icon" .value=${entity.unique_id}>
                  <span>
                    ${this.hass.states[entity.entity_id].attributes
                      .friendly_name}
                  </span>
                  <span slot="secondary">${entity.entity_id}</span>
                  <ha-state-icon
                    slot="graphic"
                    .hass=${this.hass}
                    .stateObj=${this.hass.states[entity.entity_id]}
                  ></ha-state-icon>
                </ha-list-item>
              `
            )}
          </ha-select>
        </section>

        <ha-button slot="secondaryAction" @click=${this._handleAddClick}>
          binding
        </ha-button>
      </ha-dialog>
    `;
  }

  public closeDialog(): void {
    this.device_id = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .binding-controls {
          display: grid;
          gap: 20px;
          font-size: 20px;
        }

        .binding-controls ha-button {
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-node-binding": DialogMatterNodeBinding;
  }
}
